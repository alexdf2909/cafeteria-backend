import { BaseRepository } from "../../common/db/base.repository";
import {NewPurchase, purchase, purchaseItem, supplier, user} from "../../db/schema";
import { GetPurchasesQuery } from "./purchase.dto";
import { buildPagination } from "../../common/http/pagination.helpers";
import { buildWhereClause, countRows } from "../../common/db/db.helpers";
import { and, between, count, desc, eq, gte, getTableColumns, lte, sql } from "drizzle-orm";
import { db } from "../../db";

export class PurchaseRepository extends BaseRepository <
    typeof purchase,
    NewPurchase,
    never,
    number
> {
    constructor() {
        super(purchase, purchase.id, "Purchase");
    }

    async getPurchases(query: GetPurchasesQuery) {
        const { supplierId, dateFrom, dateTo, page, limit } = query;

        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const whereClause = buildWhereClause([
            supplierId ? eq(purchase.supplierId, supplierId) : undefined,
            dateFrom && dateTo
                ? between(purchase.purchaseDate, dateFrom, dateTo)
                : dateFrom
                    ? gte(purchase.purchaseDate, dateFrom)
                    : dateTo
                        ? lte(purchase.purchaseDate, dateTo)
                        : undefined,
        ]);

        const [data, countResult] = await Promise.all([
            db
                .select({
                    ...getTableColumns(purchase),
                    supplier: {
                        name: supplier.name,
                    },
                    registeredBy: {
                        name: user.name,
                    },
                })
                .from(purchase)
                .leftJoin(supplier, eq(purchase.supplierId, supplier.id))
                .leftJoin(user, eq(purchase.userId, user.id))
                .where(whereClause)
                .orderBy(desc(purchase.purchaseDate))
                .limit(limitPerPage)
                .offset(offset),
            db
                .select({ count: count() })
                .from(purchase)
                .where(whereClause),
        ]);

        return {
            data,
            total: Number(countResult[0]?.count ?? 0),
            currentPage,
            limitPerPage,
        };
    }

    async findByIdWithDetails(id: number) {
        const purchaseData = await db
            .select({
                ...getTableColumns(purchase),
                supplier: {
                    id: supplier.id,
                    name: supplier.name,
                },
                registeredBy: {
                    name: user.name,
                },
            })
            .from(purchase)
            .leftJoin(supplier, eq(purchase.supplierId, supplier.id))
            .leftJoin(user, eq(purchase.userId, user.id))
            .where(eq(purchase.id, id));

        if (!purchaseData[0]) return null;

        const items = await db
            .select({
                ...getTableColumns(purchaseItem),
            })
            .from(purchaseItem)
            .where(eq(purchaseItem.purchaseId, id));

        return {
            ...purchaseData[0],
            items,
        };
    }

    async getRecentBySupplier(supplierId: number, limit = 5) {
        return db
            .select({
                id: purchase.id,
                purchaseDate: purchase.purchaseDate,
                totalCost: purchase.totalCost,
                notes: purchase.notes,
            })
            .from(purchase)
            .where(eq(purchase.supplierId, supplierId))
            .orderBy(desc(purchase.purchaseDate))
            .limit(limit);
    }
}



export const purchaseRepository = new PurchaseRepository();