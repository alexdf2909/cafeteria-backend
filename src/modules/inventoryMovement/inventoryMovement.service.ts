import {
    TransferDto,
    AdjustmentDto,
    DamageDto,
    ExpirationDto,
    GetMovementsQuery,
} from "./inventoryMovement.dto";
import { inventoryMovementRepository } from "./inventoryMovement.repository";
import { buildPaginationMeta } from "../../common/http/pagination.helpers";
import { badRequest, notFound } from "../../errors/error.helpers";
import {
    inventoryLot,
    lotBalance,
    inventoryMovement,
    expirationAlert,
    restockAlert,
    item,
} from "../../db/schema";
import { and, eq, gt, isNotNull, isNull, lte } from "drizzle-orm";
import { db } from "../../db";
import { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { PgTransaction } from "drizzle-orm/pg-core";

type DbOrTx = NeonHttpDatabase<Record<string, never>> | PgTransaction<any, any, any>;

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getMovementsService(query: GetMovementsQuery) {
    const result = await inventoryMovementRepository.getMovements(query);
    return {
        data: result.data,
        meta: buildPaginationMeta(result.currentPage, result.limitPerPage, result.total),
    };
}

export async function getStockByItemService(itemId: number) {
    return inventoryMovementRepository.getStockByItem(itemId);
}

export async function getExpiredAlertsService() {
    return inventoryMovementRepository.getExpiredAlertsActive();
}

// ─── Check expirados (llamado desde dashboard) ────────────────────────────────

export async function checkExpiredLots() {
    const today = new Date();

    const expiredLots = await db
        .select({ lotId: inventoryLot.id })
        .from(inventoryLot)
        .innerJoin(lotBalance, eq(inventoryLot.id, lotBalance.lotId))
        .where(
            and(
                isNotNull(inventoryLot.expirationDate),
                lte(inventoryLot.expirationDate, today),
                gt(lotBalance.quantity, 0)
            )
        );

    for (const lot of expiredLots) {
        const existing = await db
            .select()
            .from(expirationAlert)
            .where(
                and(
                    eq(expirationAlert.lotId, lot.lotId),
                    isNull(expirationAlert.resolvedAt)
                )
            )
            .limit(1);

        if (!existing[0]) {
            await db.insert(expirationAlert).values({
                lotId: lot.lotId,
                alertDate: today,
            });
        }
    }
}

export async function manualExpirationService(
    data: { lotId: number; location: "warehouse" | "sales_module"; notes?: string | null | undefined; movementDate: Date },
    userId: string
) {
    return await db.transaction(async (tx) => {
        const balances = await tx
            .select()
            .from(lotBalance)
            .where(
                and(
                    eq(lotBalance.lotId, data.lotId),
                    eq(lotBalance.location, data.location)
                )
            );

        for (const balance of balances) {
            if (Number(balance.quantity) > 0) {
                await tx
                    .update(lotBalance)
                    .set({ quantity: 0 })
                    .where(eq(lotBalance.id, balance.id));

                await tx.insert(inventoryMovement).values({
                    lotId: data.lotId,
                    movementType: "expiration",
                    quantity: balance.quantity,
                    locationFrom: data.location,
                    performedBy: userId,
                    movementDate: data.movementDate,
                    notes: data.notes,
                });
            }
        }
    });
}

// ─── Transfer ─────────────────────────────────────────────────────────────────

export async function transferStockService(data: TransferDto, userId: string) {
    // Obtener lotes disponibles FEFO en la ubicación origen
    const availableLots = await inventoryMovementRepository.getAvailableLotsFEFO(
        data.itemId,
        data.fromLocation
    );

    const totalAvailable = availableLots.reduce(
        (sum, lot) => sum + Number(lot.availableQuantity),
        0
    );

    if (totalAvailable < data.quantity) {
        throw badRequest(
            `Insufficient stock. Available: ${totalAvailable}, requested: ${data.quantity}`
        );
    }

    return await db.transaction(async (tx) => {
        let remaining = data.quantity;

        for (const lot of availableLots) {
            if (remaining <= 0) break;

            const toDeduct = Math.min(remaining, Number(lot.availableQuantity));
            remaining -= toDeduct;

            // Descontar del origen
            await tx
                .update(lotBalance)
                .set({ quantity: Number(lot.availableQuantity) - toDeduct })
                .where(eq(lotBalance.id, lot.lotBalanceId));

            // Verificar si ya existe lotBalance en destino
            const existingDestination = await tx
                .select()
                .from(lotBalance)
                .where(
                    and(
                        eq(lotBalance.lotId, lot.lotId),
                        eq(lotBalance.location, data.toLocation)
                    )
                )
                .limit(1);

            if (existingDestination[0]) {
                // Sumar al existente
                await tx
                    .update(lotBalance)
                    .set({ quantity: Number(existingDestination[0].quantity) + toDeduct })
                    .where(eq(lotBalance.id, existingDestination[0].id));
            } else {
                // Crear nuevo lotBalance en destino
                await tx.insert(lotBalance).values({
                    lotId: lot.lotId,
                    location: data.toLocation,
                    quantity: toDeduct,
                });
            }

            // Registrar movimiento
            await tx.insert(inventoryMovement).values({
                lotId: lot.lotId,
                movementType: "transfer",
                quantity: toDeduct,
                locationFrom: data.fromLocation,
                locationTo: data.toLocation,
                performedBy: userId,
                movementDate: data.movementDate,
                notes: data.notes,
            });
        }
    });
}

// ─── Adjustment ───────────────────────────────────────────────────────────────

export async function adjustStockService(data: AdjustmentDto, userId: string) {
    const currentBalance = await db
        .select()
        .from(lotBalance)
        .where(
            and(
                eq(lotBalance.lotId, data.lotId),
                eq(lotBalance.location, data.location)
            )
        )
        .limit(1);

    if (!currentBalance[0]) throw notFound("Lot balance");

    const currentQuantity = Number(currentBalance[0].quantity);
    const difference = data.newQuantity - currentQuantity;

    if (difference === 0) throw badRequest("New quantity is the same as current quantity");

    return await db.transaction(async (tx) => {
        await tx
            .update(lotBalance)
            .set({ quantity: data.newQuantity })
            .where(eq(lotBalance.id, currentBalance[0]!.id));

        await tx.insert(inventoryMovement).values({
            lotId: data.lotId,
            movementType: "adjustment",
            quantity: Math.abs(difference),
            locationFrom: difference < 0 ? data.location : undefined,
            locationTo: difference > 0 ? data.location : undefined,
            performedBy: userId,
            movementDate: data.movementDate,
            notes: data.notes,
        });

        // Verificar restockAlert si el stock bajó
        if (difference < 0) {
            const lotData = await tx
                .select({ itemId: inventoryLot.itemId })
                .from(inventoryLot)
                .where(eq(inventoryLot.id, data.lotId))
                .limit(1);

            if (lotData[0]) {
                await checkAndCreateRestockAlert(lotData[0].itemId, tx);
            }
        }
    });
}

// ─── Damage ───────────────────────────────────────────────────────────────────

export async function damageStockService(data: DamageDto, userId: string) {
    const currentBalance = await db
        .select()
        .from(lotBalance)
        .where(
            and(
                eq(lotBalance.lotId, data.lotId),
                eq(lotBalance.location, data.location)
            )
        )
        .limit(1);

    if (!currentBalance[0]) throw notFound("Lot balance");

    if (Number(currentBalance[0].quantity) < data.quantity) {
        throw badRequest(
            `Insufficient stock. Available: ${currentBalance[0].quantity}, requested: ${data.quantity}`
        );
    }

    return await db.transaction(async (tx) => {
        await tx
            .update(lotBalance)
            .set({ quantity: Number(currentBalance[0]!.quantity) - data.quantity })
            .where(eq(lotBalance.id, currentBalance[0]!.id));

        await tx.insert(inventoryMovement).values({
            lotId: data.lotId,
            movementType: "damage",
            quantity: data.quantity,
            locationFrom: data.location,
            performedBy: userId,
            movementDate: data.movementDate,
            notes: data.notes,
        });

        // Verificar restockAlert
        const lotData = await tx
            .select({ itemId: inventoryLot.itemId })
            .from(inventoryLot)
            .where(eq(inventoryLot.id, data.lotId))
            .limit(1);

        if (lotData[0]) {
            await checkAndCreateRestockAlert(lotData[0].itemId, tx);
        }
    });
}

// ─── Expiration ───────────────────────────────────────────────────────────────

export async function resolveExpirationService(data: ExpirationDto, userId: string) {
    const alert = await db
        .select()
        .from(expirationAlert)
        .where(eq(expirationAlert.id, data.alertId))
        .limit(1);

    if (!alert[0]) throw notFound("Expiration alert");
    if (alert[0].resolvedAt) throw badRequest("Alert already resolved");

    return await db.transaction(async (tx) => {
        // Descontar todo el stock del lote en todas las ubicaciones
        const balances = await tx
            .select()
            .from(lotBalance)
            .where(eq(lotBalance.lotId, alert[0]!.lotId));

        for (const balance of balances) {
            if (Number(balance.quantity) > 0) {
                await tx
                    .update(lotBalance)
                    .set({ quantity: 0 })
                    .where(eq(lotBalance.id, balance.id));

                await tx.insert(inventoryMovement).values({
                    lotId: alert[0]!.lotId,
                    movementType: "expiration",
                    quantity: balance.quantity,
                    locationFrom: balance.location,
                    performedBy: userId,
                    movementDate: data.movementDate,
                    notes: data.notes,
                });
            }
        }

        // Resolver la alerta
        await tx
            .update(expirationAlert)
            .set({ resolvedAt: new Date(), resolvedBy: userId })
            .where(eq(expirationAlert.id, data.alertId));
    });
}

// ─── Helper interno ───────────────────────────────────────────────────────────

export async function checkAndCreateRestockAlert(itemId: number, tx: DbOrTx) {
    const itemData = await tx
        .select({ reorderPoint: item.reorderPoint })
        .from(item)
        .where(eq(item.id, itemId))
        .limit(1);

    if (!itemData[0]) return;

    const stock = await tx
        .select({ total: lotBalance.quantity })
        .from(inventoryLot)
        .innerJoin(lotBalance, eq(inventoryLot.id, lotBalance.lotId))
        .where(eq(inventoryLot.itemId, itemId));

    const totalStock = stock.reduce((sum, s) => sum + Number(s.total), 0);

    if (totalStock <= Number(itemData[0].reorderPoint)) {
        const existing = await tx
            .select()
            .from(restockAlert)
            .where(
                and(
                    eq(restockAlert.itemId, itemId),
                    isNull(restockAlert.resolvedAt)
                )
            )
            .limit(1);

        if (!existing[0]) {
            await tx.insert(restockAlert).values({
                itemId,
                alertDate: new Date(),
                stockAtAlert: totalStock,
            });
        }
    }
}