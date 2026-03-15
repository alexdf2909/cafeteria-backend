import { BaseRepository } from "../../common/db/base.repository";
import {
    inventoryMovement,
    inventoryLot,
    lotBalance,
    expirationAlert,
    item,
    unit, NewInventoryMovement,
} from "../../db/schema";
import { GetMovementsQuery } from "./inventoryMovement.dto";
import { buildPagination } from "../../common/http/pagination.helpers";
import { buildWhereClause } from "../../common/db/db.helpers";
import {
    and,
    asc,
    between,
    count,
    desc,
    eq,
    gt,
    getTableColumns,
    gte,
    isNotNull,
    isNull,
    lte,
    sql,
} from "drizzle-orm";
import { db } from "../../db";

export class InventoryMovementRepository extends BaseRepository<
typeof inventoryMovement,
    NewInventoryMovement,
    never,
number
> {
    constructor() {
        super(inventoryMovement, inventoryMovement.id, "InventoryMovement");
    }

    async getMovements(query: GetMovementsQuery) {
        const { itemId, lotId, movementType, location, dateFrom, dateTo, page, limit } = query;
        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const whereClause = buildWhereClause([
            itemId ? eq(inventoryLot.itemId, itemId) : undefined,
            lotId ? eq(inventoryMovement.lotId, lotId) : undefined,
            movementType ? eq(inventoryMovement.movementType, movementType) : undefined,
            location
                ? sql`(${inventoryMovement.locationFrom} = ${location} OR ${inventoryMovement.locationTo} = ${location})`
                : undefined,
            dateFrom && dateTo
                ? between(inventoryMovement.movementDate, dateFrom, dateTo)
                : dateFrom
                    ? gte(inventoryMovement.movementDate, dateFrom)
                    : dateTo
                        ? lte(inventoryMovement.movementDate, dateTo)
                        : undefined,
        ]);

        const [data, countResult] = await Promise.all([
            db
                .select({
                    ...getTableColumns(inventoryMovement),
                    lot: {
                        batchNumber: inventoryLot.batchNumber,
                        expirationDate: inventoryLot.expirationDate,
                    },
                    item: {
                        id: item.id,
                        name: item.name,
                        sku: item.sku,
                    },
                })
                .from(inventoryMovement)
                .innerJoin(inventoryLot, eq(inventoryMovement.lotId, inventoryLot.id))
                .innerJoin(item, eq(inventoryLot.itemId, item.id))
                .where(whereClause)
                .orderBy(desc(inventoryMovement.movementDate))
                .limit(limitPerPage)
                .offset(offset),
            db
                .select({ count: count() })
                .from(inventoryMovement)
                .innerJoin(inventoryLot, eq(inventoryMovement.lotId, inventoryLot.id))
                .where(whereClause),
        ]);

        return {
            data,
            total: Number(countResult[0]?.count ?? 0),
            currentPage,
            limitPerPage,
        };
    }

    // FEFO — lotes ordenados por fecha de vencimiento, primero los que vencen antes
    async getAvailableLotsFEFO(itemId: number, location: "warehouse" | "sales_module") {
        return db
            .select({
                lotId: inventoryLot.id,
                batchNumber: inventoryLot.batchNumber,
                expirationDate: inventoryLot.expirationDate,
                availableQuantity: lotBalance.quantity,
                lotBalanceId: lotBalance.id,
            })
            .from(inventoryLot)
            .innerJoin(lotBalance, eq(inventoryLot.id, lotBalance.lotId))
            .where(
                and(
                    eq(inventoryLot.itemId, itemId),
                    eq(lotBalance.location, location),
                    gt(lotBalance.quantity, 0)
                )
            )
            .orderBy(
                // Perecederos primero por fecha de vencimiento, no perecederos por fecha de entrada
                sql`CASE WHEN ${inventoryLot.expirationDate} IS NULL THEN 1 ELSE 0 END`,
                asc(inventoryLot.expirationDate),
                asc(inventoryLot.receivedAt)
            );
    }

    async getStockByItem(itemId: number) {
        return db
            .select({
                location: lotBalance.location,
                total: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)`,
            })
            .from(inventoryLot)
            .innerJoin(lotBalance, eq(inventoryLot.id, lotBalance.lotId))
            .where(eq(inventoryLot.itemId, itemId))
            .groupBy(lotBalance.location);
    }

    async getExpiredAlertsActive() {
        return db
            .select({
                ...getTableColumns(expirationAlert),
                lot: {
                    batchNumber: inventoryLot.batchNumber,
                    expirationDate: inventoryLot.expirationDate,
                },
                item: {
                    id: item.id,
                    name: item.name,
                },
            })
            .from(expirationAlert)
            .innerJoin(inventoryLot, eq(expirationAlert.lotId, inventoryLot.id))
            .innerJoin(item, eq(inventoryLot.itemId, item.id))
            .where(isNull(expirationAlert.resolvedAt))
            .orderBy(asc(inventoryLot.expirationDate));
    }
}

export const inventoryMovementRepository = new InventoryMovementRepository();