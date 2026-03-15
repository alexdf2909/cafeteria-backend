import { CreatePurchaseDto, GetPurchasesQuery } from "./purchase.dto";
import { purchaseRepository } from "./purchase.repository";
import { supplierRepository } from "../supplier/supplier.repository";
import { itemPackageRepository } from "../itemPackage/itemPackage.repository";
import { itemSupplierRepository } from "../itemSupplier/itemSupplier.repository";
import { buildPaginationMeta } from "../../common/http/pagination.helpers";
import {badRequest, notFound} from "../../errors/error.helpers";
import { db } from "../../db";
import {
    inventoryLot,
    lotBalance,
    inventoryMovement,
    restockAlert,
    purchaseItem,
    purchase,
    itemSupplier
} from "../../db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function getPurchasesService(query: GetPurchasesQuery) {
    const result = await purchaseRepository.getPurchases(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(result.currentPage, result.limitPerPage, result.total),
    };
}

export async function getPurchaseByIdService(purchaseId: number) {
    const result = await purchaseRepository.findByIdWithDetails(purchaseId);

    if (!result) {
        throw notFound("Purchase");
    }

    return result;
}

export async function createPurchaseService(data: CreatePurchaseDto, userId: string) {
    // 1. Verificar que el supplier existe y está activo
    const supplierData = await supplierRepository.findByIdOrFail(data.supplierId);
    if (!supplierData.active) {
        throw badRequest("Supplier is not active");
    }

    // 2. Verificar cada item antes de crear cualquier cosa
    const packageDataMap = new Map<number, Awaited<ReturnType<typeof itemPackageRepository.findByIdWithDetails>>>();

    for (const purchaseItemData of data.items) {
        const packageData = await itemPackageRepository.findByIdWithDetails(purchaseItemData.itemPackageId);

        if (!packageData) {
            throw badRequest(`Item package ${purchaseItemData.itemPackageId} not found`);
        }

        if (packageData.item.isPerishable && !purchaseItemData.expirationDate) {
            throw badRequest(`Item "${packageData.item.name}" is perishable and requires an expiration date`);
        }

        if (!packageData.item.isPerishable && purchaseItemData.expirationDate) {
            throw badRequest(`Item "${packageData.item.name}" is not perishable and should not have an expiration date`);
        }

        packageDataMap.set(purchaseItemData.itemPackageId, packageData);
    }

    // 3. Calcular totalCost
    const totalCost = data.items.reduce(
        (sum, i) => sum + i.quantity * i.unitCost,
        0
    );

    // 4. Crear todo en una transacción
    return await db.transaction(async (tx) => {

        // 4.1 Crear la compra
        const [newPurchase] = await tx
            .insert(purchase)
            .values({
                userId,
                supplierId: data.supplierId,
                purchaseDate: data.purchaseDate,
                notes: data.notes,
                totalCost,
            })
            .returning();

        if (!newPurchase) {
            throw new Error("Failed to create purchase");
        }
        const newPurchaseId = newPurchase.id;

        for (const purchaseItemData of data.items) {
            const packageData = packageDataMap.get(purchaseItemData.itemPackageId)!;

            // 4.2 Crear purchaseItem
            const resultPurchaseItem = await tx
                .insert(purchaseItem)
                .values({
                    purchaseId: newPurchase!.id,
                    itemPackageId: purchaseItemData.itemPackageId,
                    quantity: purchaseItemData.quantity,
                    unitCost: purchaseItemData.unitCost,
                })
                .returning();

            const newPurchaseItem = resultPurchaseItem[0];

            if (!newPurchaseItem) {
                throw new Error("Failed to create purchase");
            }

            // 4.3 Crear inventoryLot
            const resultInventoryLot = await tx
                .insert(inventoryLot)
                .values({
                    itemId: packageData.item.id,
                    batchNumber: purchaseItemData.batchNumber,
                    expirationDate: purchaseItemData.expirationDate ?? null,
                    receivedAt: data.purchaseDate,
                })
                .returning();

            const  newLot = resultInventoryLot[0];

            if (!newLot) {
                throw new Error("Failed to create lot");
            }

            // 4.4 Calcular cantidad en unidades base
            const quantityInBaseUnits = purchaseItemData.quantity * packageData.baseUnitQuantity;

            // 4.5 Crear lotBalance en warehouse
            await tx.insert(lotBalance).values({
                lotId: newLot.id,
                location: "warehouse",
                quantity: quantityInBaseUnits,
            });

            // 4.6 Crear inventoryMovement
            await tx.insert(inventoryMovement).values({
                lotId: newLot.id,
                movementType: "purchase",
                quantity: quantityInBaseUnits,
                locationTo: "warehouse",
                purchaseItemId: newPurchaseItem.id,
                performedBy: userId,
                movementDate: data.purchaseDate,
            });

            // 4.7 Actualizar lastUnitCost en itemSupplier si existe la relación
            const relation = await itemSupplierRepository.findBySupplierAndPackage(
                data.supplierId,
                purchaseItemData.itemPackageId
            );

            if (relation) {
                await tx
                    .update(itemSupplier)
                    .set({ lastUnitCost: purchaseItemData.unitCost })
                    .where(eq(itemSupplier.id, relation.id));
            }

            // 4.8 Resolver restockAlert si hay una activa para este item
            await tx
                .update(restockAlert)
                .set({
                    resolvedAt: new Date(),
                    purchaseId: newPurchaseId,
                })
                .where(
                    and(
                        eq(restockAlert.itemId, packageData.item.id),
                        isNull(restockAlert.resolvedAt)
                    )
                );
        }

        return newPurchase;
    });
}