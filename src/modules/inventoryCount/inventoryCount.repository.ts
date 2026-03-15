import { BaseRepository } from "../../common/db/base.repository";
import {
    inventoryCount,
    inventoryCountLine,
    inventoryLot,
    lotBalance,
    item,
    user, NewInventoryCount,
} from "../../db/schema";
import { GetInventoryCountsQuery } from "./inventoryCount.dto";
import { buildPagination } from "../../common/http/pagination.helpers";
import { buildWhereClause } from "../../common/db/db.helpers";
import { and, between, count, desc, eq, getTableColumns, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db";

export class InventoryCountRepository extends BaseRepository<
typeof inventoryCount,
    NewInventoryCount,
    never,
number
> {
    constructor() {
        super(inventoryCount, inventoryCount.id, "InventoryCount");
    }

    async getInventoryCounts(query: GetInventoryCountsQuery) {
        const { location, dateFrom, dateTo, page, limit } = query;
        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const whereClause = buildWhereClause([
            location ? eq(inventoryCount.location, location) : undefined,
            dateFrom && dateTo
                ? between(inventoryCount.countDate, dateFrom, dateTo)
                : dateFrom
                    ? gte(inventoryCount.countDate, dateFrom)
                    : dateTo
                        ? lte(inventoryCount.countDate, dateTo)
                        : undefined,
        ]);

        const [data, countResult] = await Promise.all([
            db
                .select({
                    ...getTableColumns(inventoryCount),
                    countedBy: {
                        name: user.name,
                    },
                })
                .from(inventoryCount)
                .leftJoin(user, eq(inventoryCount.countedBy, user.id))
                .where(whereClause)
                .orderBy(desc(inventoryCount.countDate))
                .limit(limitPerPage)
                .offset(offset),
            db
                .select({ count: count() })
                .from(inventoryCount)
                .where(whereClause),
        ]);

        return {
            data,
            total: Number(countResult[0]?.count ?? 0),
            currentPage,
            limitPerPage,
        };
    }

    async findByIdWithLines(id: number) {
        const countData = await db
            .select({
                ...getTableColumns(inventoryCount),
                countedBy: {
                    name: user.name,
                },
            })
            .from(inventoryCount)
            .leftJoin(user, eq(inventoryCount.countedBy, user.id))
            .where(eq(inventoryCount.id, id));

        if (!countData[0]) return null;

        const lines = await db
            .select({
                ...getTableColumns(inventoryCountLine),
                item: {
                    id: item.id,
                    name: item.name,
                    sku: item.sku,
                },
            })
            .from(inventoryCountLine)
            .leftJoin(item, eq(inventoryCountLine.itemId, item.id))
            .where(eq(inventoryCountLine.inventoryCountId, id));

        return {
            ...countData[0],
            lines,
        };
    }

    // Obtener stock actual del sistema por item y ubicación
    async getSystemStock(itemId: number, location: "warehouse" | "sales_module") {
        const result = await db
            .select({
                total: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)`,
            })
            .from(inventoryLot)
            .innerJoin(lotBalance, eq(inventoryLot.id, lotBalance.lotId))
            .where(
                and(
                    eq(inventoryLot.itemId, itemId),
                    eq(lotBalance.location, location)
                )
            );

        return Number(result[0]?.total ?? 0);
    }
}

export const inventoryCountRepository = new InventoryCountRepository();