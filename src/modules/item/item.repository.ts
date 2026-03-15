import { BaseRepository } from "../../common/db/base.repository";
import {inventoryLot, item, itemCategory, itemPackage, lotBalance, NewItem, unit} from "../../db/schema";
import {GetItemsByCategoryQuery, GetItemsQuery, UpdateItemDto} from "./item.dto";
import { buildPagination } from "../../common/http/pagination.helpers";
import {buildWhereClause, countRows} from "../../common/db/db.helpers";
import { and, count, desc, eq, getTableColumns, ilike, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../db";

export class ItemRepository extends BaseRepository<typeof item, NewItem, UpdateItemDto, number> {
    constructor() {
        super(item, item.id, "Item");
    }

    async getItems(query: GetItemsQuery) {
        const { search, category, status, lowStock, expiringSoon, page, limit } = query;

        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const stockSubquery = db
            .select({
                itemId: inventoryLot.itemId,
                totalStock: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)`,
            })
            .from(inventoryLot)
            .leftJoin(lotBalance, eq(inventoryLot.id, lotBalance.lotId))
            .groupBy(inventoryLot.itemId)
            .as("stock_sub");

        const expiringDate = new Date();
        expiringDate.setDate(expiringDate.getDate() + 7);

        const expiringSubquery = db
            .selectDistinct({ itemId: inventoryLot.itemId })
            .from(inventoryLot)
            .where(
                and(
                    isNotNull(inventoryLot.expirationDate),
                    lte(inventoryLot.expirationDate, expiringDate)
                )
            )
            .as("expiring_sub");

        const conditions = buildWhereClause([
            search
                ? or(ilike(item.name, `%${search}%`), ilike(item.sku, `%${search}%`))
                : undefined,
            category ? ilike(itemCategory.name, `%${category}%`) : undefined,
            status ? eq(item.status, status) : undefined,
            lowStock
                ? sql`coalesce(${stockSubquery.totalStock}, 0) <= ${item.reorderPoint}`
                : undefined,
            expiringSoon
                ? sql`${expiringSubquery.itemId} IS NOT NULL`
                : undefined,
        ]);

        const baseQuery = () =>
            db
                .select({
                    ...getTableColumns(item),
                    baseUnit: { ...getTableColumns(unit) },
                    category: { ...getTableColumns(itemCategory) },
                    totalStock: stockSubquery.totalStock,
                })
                .from(item)
                .leftJoin(unit, eq(item.baseUnitId, unit.id))
                .leftJoin(itemCategory, eq(item.categoryId, itemCategory.id))
                .leftJoin(stockSubquery, eq(stockSubquery.itemId, item.id))
                .leftJoin(expiringSubquery, eq(expiringSubquery.itemId, item.id))
                .$dynamic();

        const [data, countResult] = await Promise.all([
            baseQuery()
                .where(conditions)
                .orderBy(desc(item.createdAt))
                .limit(limitPerPage)
                .offset(offset),
            db
                .select({ count: count() })
                .from(item)
                .leftJoin(unit, eq(item.baseUnitId, unit.id))
                .leftJoin(itemCategory, eq(item.categoryId, itemCategory.id))
                .leftJoin(stockSubquery, eq(stockSubquery.itemId, item.id))
                .leftJoin(expiringSubquery, eq(expiringSubquery.itemId, item.id))
                .where(conditions),
        ]);

        return {
            data,
            total: Number(countResult[0]?.count ?? 0),
            currentPage,
            limitPerPage,
        };
    }

    async countItemPackages(itemId: number) {
        return countRows(
            itemPackage,
            eq(itemPackage.itemId, itemId)
        );
    }

    async findByIdWithDetails(id: number) {
        const result = await db
            .select({
                ...getTableColumns(item),
                category: {
                    name: itemCategory.name,
                },
                baseUnit: {
                    name: unit.name,
                    symbol: unit.symbol,
                },
            })
            .from(item)
            .leftJoin(itemCategory, eq(item.categoryId, itemCategory.id))
            .leftJoin(unit, eq(item.baseUnitId, unit.id))
            .where(eq(item.id, id));

        return result;
    }

    async getItemsByCategory(query: GetItemsByCategoryQuery) {
        const { categoryId, page, limit } = query;
        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const total = await countRows(item, eq(item.categoryId, categoryId));

        const data = await db
            .select({
                ...getTableColumns(item),
                baseUnit: {
                    name: unit.name,
                    symbol: unit.symbol,
                },

            })
            .from(item)
            .leftJoin(unit, eq(item.baseUnitId, unit.id))
            .leftJoin(itemCategory, eq(item.categoryId, itemCategory.id))
            .where(eq(item.categoryId, categoryId))
            .orderBy(desc(item.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        return {
            data,
            total,
            currentPage,
            limitPerPage,
        };
    }

    //stock total por ubicación
    async getItemStock(itemId: number) {
        const stock = await db
            .select({
                location: lotBalance.location,
                total: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)`
            })
            .from(inventoryLot)
            .leftJoin(lotBalance, eq(inventoryLot.id, lotBalance.lotId))
            .where(eq(inventoryLot.itemId, itemId))
            .groupBy(lotBalance.location);

        return stock;
    }
    // listar lotes del item por fecha de vencimiento o fecha de compra
    // listar movimientos del item
    // listar itemPackages del item

}

export const itemRepository = new ItemRepository();