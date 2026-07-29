import { CreateInventoryCountDto, GetInventoryCountsQuery } from "./inventoryCount.dto";
import { inventoryCountRepository } from "./inventoryCount.repository";
import { buildPaginationMeta } from "../../common/http/pagination.helpers";
import { notFound } from "../../errors/error.helpers";
import {
    inventoryCount,
    inventoryCountLine,
    inventoryMovement,
    inventoryLot,
    lotBalance,
} from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { checkAndCreateRestockAlert } from "../inventoryMovement/inventoryMovement.service";

export async function getInventoryCountsService(query: GetInventoryCountsQuery) {
    const result = await inventoryCountRepository.getInventoryCounts(query);
    return {
        data: result.data,
        meta: buildPaginationMeta(result.currentPage, result.limitPerPage, result.total),
    };
}

export async function getInventoryCountByIdService(countId: number) {
    const result = await inventoryCountRepository.findByIdWithLines(countId);
    if (!result) throw notFound("Inventory count");
    return result;
}

export async function createInventoryCountService(
    data: CreateInventoryCountDto,
    userId: string
) {
    return await db.transaction(async (tx) => {

        // 1. Crear el conteo
        const countResult = await tx
            .insert(inventoryCount)
            .values({
                countDate: data.countDate,
                location: data.location,
                countedBy: userId,
            })
            .returning();

        const newCount = countResult[0];
        if (!newCount) throw new Error("Failed to create inventory count");

        // 2. Por cada línea del conteo
        for (const line of data.lines) {

            // 2.1 Obtener stock actual del sistema
            const systemQuantity = await inventoryCountRepository.getSystemStock(
                line.itemId,
                data.location
            );

            // 2.2 Crear línea del conteo
            const countLineResult = await tx
                .insert(inventoryCountLine)
                .values({
                    inventoryCountId: newCount.id,
                    itemId: line.itemId,
                    systemQuantity,
                    countedQuantity: line.countedQuantity,
                })
                .returning();

            const newCountLine = countLineResult[0];
            if (!newCountLine) throw new Error("Failed to create count line");

            // 2.3 Si hay diferencia, ajustar el stock
            const difference = line.countedQuantity - systemQuantity;

            if (difference !== 0) {
                // Obtener lotes del item en esa ubicación para ajustar
                const lots = await tx
                    .select({
                        lotId: inventoryLot.id,
                        lotBalanceId: lotBalance.id,
                        quantity: lotBalance.quantity,
                    })
                    .from(inventoryLot)
                    .innerJoin(lotBalance, eq(inventoryLot.id, lotBalance.lotId))
                    .where(
                        and(
                            eq(inventoryLot.itemId, line.itemId),
                            eq(lotBalance.location, data.location)
                        )
                    )
                    .orderBy(inventoryLot.receivedAt);

                if (difference > 0) {
                    // Hay más stock del que el sistema creía
                    // Agregar al lote más reciente
                    const lastLot = lots[lots.length - 1];

                    if (lastLot) {
                        await tx
                            .update(lotBalance)
                            .set({ quantity: Number(lastLot.quantity) + difference })
                            .where(eq(lotBalance.id, lastLot.lotBalanceId));

                        await tx.insert(inventoryMovement).values({
                            lotId: lastLot.lotId,
                            movementType: "count",
                            quantity: difference,
                            locationTo: data.location,
                            inventoryCountLineId: newCountLine.id,
                            performedBy: userId,
                            movementDate: data.countDate,
                            notes: `Inventory count adjustment`,
                        });
                    }
                } else {
                    // Hay menos stock del que el sistema creía — descontar FEFO
                    let remaining = Math.abs(difference);

                    for (const lot of lots) {
                        if (remaining <= 0) break;

                        const toDeduct = Math.min(remaining, Number(lot.quantity));
                        remaining -= toDeduct;

                        await tx
                            .update(lotBalance)
                            .set({ quantity: Number(lot.quantity) - toDeduct })
                            .where(eq(lotBalance.id, lot.lotBalanceId));

                        await tx.insert(inventoryMovement).values({
                            lotId: lot.lotId,
                            movementType: "count",
                            quantity: toDeduct,
                            locationFrom: data.location,
                            inventoryCountLineId: newCountLine.id,
                            performedBy: userId,
                            movementDate: data.countDate,
                            notes: `Inventory count adjustment`,
                        });
                    }

                    // Verificar restockAlert si el stock bajó
                    await checkAndCreateRestockAlert(line.itemId, tx);
                }
            }
        }

        return newCount;
    });
}