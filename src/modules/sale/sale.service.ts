import { CreateSaleDto, GetSalesQuery } from "./sale.dto";
import { saleRepository } from "./sale.repository";
import { buildPaginationMeta } from "../../common/http/pagination.helpers";
import { notFound, badRequest } from "../../errors/error.helpers";
import {
    sale,
    saleProduct,
    saleRecipeOptional,
    recipe,
    recipeItem,
    inventoryMovement,
    lotBalance, item, productPresentation,
} from "../../db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db";
import { inventoryMovementRepository } from "../inventoryMovement/inventoryMovement.repository";
import { checkAndCreateRestockAlert } from "../inventoryMovement/inventoryMovement.service";

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getSalesService(query: GetSalesQuery) {
    const result = await saleRepository.getSales(query);
    return {
        data: result.data,
        meta: buildPaginationMeta(result.currentPage, result.limitPerPage, result.total),
    };
}

export async function getSaleByIdService(saleId: number) {
    const result = await saleRepository.findByIdWithDetails(saleId);
    if (!result) throw notFound("Sale");
    return result;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createSaleService(data: CreateSaleDto, userId: string) {

    // 1. Verificar recetas y calcular ingredientes necesarios
    const recipeDataMap = new Map<number, {
        recipeData: typeof recipe.$inferSelect,
        items: (typeof recipeItem.$inferSelect)[],
        unitPrice: number,
    }>();

    for (const saleProductData of data.products) {
        const recipeData = await db
            .select()
            .from(recipe)
            .where(eq(recipe.id, saleProductData.recipeId))
            .limit(1);

        if (!recipeData[0]) throw notFound(`Recipe ${saleProductData.recipeId}`);
        if (!recipeData[0].isActive) throw badRequest(`Recipe ${saleProductData.recipeId} is not active`);

        const recipeItems = await db
            .select()
            .from(recipeItem)
            .where(eq(recipeItem.recipeId, saleProductData.recipeId));

        // Obtener precio de la presentación
        const presentationData = await db
            .select({
                price: productPresentation.price,
            })
            .from(recipe)
            .innerJoin(
                productPresentation,
                eq(recipe.productPresentationId, productPresentation.id)
            )
            .where(eq(recipe.id, saleProductData.recipeId))
            .limit(1);

        if (!presentationData[0]) throw notFound("Product presentation");

        recipeDataMap.set(saleProductData.recipeId, {
            recipeData: recipeData[0],
            items: recipeItems,
            unitPrice: Number(presentationData[0].price),
        });
    }

    // 2. Verificar stock disponible en sales_module para cada ingrediente
    const stockNeeded = new Map<number, number>(); // itemId → cantidad total necesaria

    for (const saleProductData of data.products) {
        const recipeInfo = recipeDataMap.get(saleProductData.recipeId)!;

        for (const recipeItemData of recipeInfo.items) {
            // Saltar opcionales que el cliente no pidió
            if (recipeItemData.isOptional) {
                const wasRequested = saleProductData.optionals.some(
                    o => o.recipeItemId === recipeItemData.id
                );
                if (!wasRequested && recipeItemData.optionalType !== "exclude") continue;
                if (recipeItemData.optionalType === "exclude") continue;
            }

            const needed = Number(recipeItemData.quantity) * saleProductData.quantity;
            const current = stockNeeded.get(recipeItemData.itemId) ?? 0;
            stockNeeded.set(recipeItemData.itemId, current + needed);
        }

        // Agregar opcionales extra
        for (const optional of saleProductData.optionals) {
            const recipeItemData = recipeInfo.items.find(i => i.id === optional.recipeItemId);
            if (!recipeItemData) throw badRequest(`Recipe item ${optional.recipeItemId} not found`);

            if (recipeItemData.optionalType === "extra") {
                const needed = Number(recipeItemData.quantity) * optional.quantity;
                const current = stockNeeded.get(recipeItemData.itemId) ?? 0;
                stockNeeded.set(recipeItemData.itemId, current + needed);
            }
        }
    }

    // Verificar stock disponible
    for (const [itemId, needed] of stockNeeded.entries()) {
        const availableLots = await inventoryMovementRepository.getAvailableLotsFEFO(
            itemId,
            "sales_module"
        );
        const totalAvailable = availableLots.reduce(
            (sum, lot) => sum + Number(lot.availableQuantity), 0
        );

        if (totalAvailable < needed) {
            const itemData = await db
                .select({ name: item.name })
                .from(item)
                .where(eq(item.id, itemId))
                .limit(1);
            // Verificar stock en warehouse
            const warehouseAvailable = await inventoryMovementRepository.getAvailableLotsFEFO(
                itemId,
                "warehouse"
            );
            const warehouseTotal = warehouseAvailable.reduce(
                (sum, lot) => sum + Number(lot.availableQuantity), 0
            );

            if (warehouseTotal >= needed) {
                throw badRequest(
                    `Insufficient stock for "${itemData[0]?.name}" in sales module. Available: ${totalAvailable}, needed: ${needed}. Stock available in warehouse: ${warehouseTotal} — please do a transfer first.`
                );
            } else {
                throw badRequest(
                    `Insufficient stock for "${itemData[0]?.name}". Available in sales module: ${totalAvailable}, in warehouse: ${warehouseTotal}, needed: ${needed} — please register a purchase.`
                );
            }
        }
    }

    // 3. Calcular totalAmount
    const totalAmount = data.products.reduce((sum, p) => {
        const recipeInfo = recipeDataMap.get(p.recipeId)!;
        const lineTotal = recipeInfo.unitPrice * p.quantity;

        const optionalsTotal = p.optionals.reduce((oSum, o) => {
            const recipeItemData = recipeInfo.items.find(i => i.id === o.recipeItemId);
            if (recipeItemData?.optionalType === "extra") {
                return oSum + (Number(recipeItemData.extraPrice) * o.quantity);
            }
            return oSum;
        }, 0);

        return sum + lineTotal + optionalsTotal;
    }, 0);

    // 4. Crear todo en transacción
    return await db.transaction(async (tx) => {

        // 4.1 Crear venta
        const saleResult = await tx
            .insert(sale)
            .values({
                registeredBy: userId,
                saleDate: data.saleDate,
                notes: data.notes,
                totalAmount,
            })
            .returning();

        const newSale = saleResult[0];
        if (!newSale) throw new Error("Failed to create sale");

        // 4.2 Por cada producto vendido
        for (const saleProductData of data.products) {
            const recipeInfo = recipeDataMap.get(saleProductData.recipeId)!;

            const totalLineAmount = recipeInfo.unitPrice * saleProductData.quantity;

            const saleProductResult = await tx
                .insert(saleProduct)
                .values({
                    saleId: newSale.id,
                    recipeId: saleProductData.recipeId,
                    quantity: saleProductData.quantity,
                    unitPrice: recipeInfo.unitPrice,
                    totalLineAmount,
                })
                .returning();

            const newSaleProduct = saleProductResult[0];
            if (!newSaleProduct) throw new Error("Failed to create sale product");

            // 4.3 Registrar opcionales
            for (const optional of saleProductData.optionals) {
                const recipeItemData = recipeInfo.items.find(i => i.id === optional.recipeItemId)!;
                const optionalUnitPrice = recipeItemData.optionalType === "extra"
                    ? Number(recipeItemData.extraPrice)
                    : 0;

                await tx.insert(saleRecipeOptional).values({
                    saleProductId: newSaleProduct.id,
                    recipeItemId: optional.recipeItemId,
                    quantity: optional.quantity,
                    unitPrice: optionalUnitPrice,
                    totalAmount: optionalUnitPrice * optional.quantity,
                });
            }
        }

        // 4.4 Descontar stock usando FEFO
        for (const [itemId, needed] of stockNeeded.entries()) {
            const availableLots = await inventoryMovementRepository.getAvailableLotsFEFO(
                itemId,
                "sales_module"
            );

            let remaining = needed;

            for (const lot of availableLots) {
                if (remaining <= 0) break;

                const toDeduct = Math.min(remaining, Number(lot.availableQuantity));
                remaining -= toDeduct;

                // Actualizar lotBalance
                await tx
                    .update(lotBalance)
                    .set({ quantity: Number(lot.availableQuantity) - toDeduct })
                    .where(eq(lotBalance.id, lot.lotBalanceId));

                // Registrar movimiento de consumo
                await tx.insert(inventoryMovement).values({
                    lotId: lot.lotId,
                    movementType: "consumption",
                    quantity: toDeduct,
                    locationFrom: "sales_module",
                    performedBy: userId,
                    movementDate: data.saleDate,
                });
            }

            // Verificar restockAlert
            await checkAndCreateRestockAlert(itemId, tx);
        }

        return newSale;
    });
}