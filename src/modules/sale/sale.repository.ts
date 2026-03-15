import { BaseRepository } from "../../common/db/base.repository";
import {
    sale,
    saleProduct,
    saleRecipeOptional,
    recipe,
    productPresentation,
    product,
    user, NewSale,
} from "../../db/schema";
import { GetSalesQuery } from "./sale.dto";
import { buildPagination } from "../../common/http/pagination.helpers";
import { buildWhereClause } from "../../common/db/db.helpers";
import { between, count, desc, eq, getTableColumns, gte, lte } from "drizzle-orm";
import { db } from "../../db";
import {inArray} from "drizzle-orm/sql/expressions/conditions";

export class SaleRepository extends BaseRepository<
typeof sale,
    NewSale,
    never,
number
> {
    constructor() {
        super(sale, sale.id, "Sale");
    }

    async getSales(query: GetSalesQuery) {
        const { dateFrom, dateTo, page, limit } = query;
        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const whereClause = buildWhereClause([
            dateFrom && dateTo
                ? between(sale.saleDate, dateFrom, dateTo)
                : dateFrom
                    ? gte(sale.saleDate, dateFrom)
                    : dateTo
                        ? lte(sale.saleDate, dateTo)
                        : undefined,
        ]);

        const [data, countResult] = await Promise.all([
            db
                .select({
                    ...getTableColumns(sale),
                    registeredBy: {
                        name: user.name,
                    },
                })
                .from(sale)
                .leftJoin(user, eq(sale.registeredBy, user.id))
                .where(whereClause)
                .orderBy(desc(sale.saleDate))
                .limit(limitPerPage)
                .offset(offset),
            db
                .select({ count: count() })
                .from(sale)
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
        const saleData = await db
            .select({
                ...getTableColumns(sale),
                registeredBy: {
                    name: user.name,
                },
            })
            .from(sale)
            .leftJoin(user, eq(sale.registeredBy, user.id))
            .where(eq(sale.id, id));

        if (!saleData[0]) return null;

        const products = await db
            .select({
                ...getTableColumns(saleProduct),
                presentation: {
                    name: productPresentation.name,
                    price: productPresentation.price,
                },
                product: {
                    name: product.name,
                    sku: product.sku,
                },
            })
            .from(saleProduct)
            .leftJoin(recipe, eq(saleProduct.recipeId, recipe.id))
            .leftJoin(productPresentation, eq(recipe.productPresentationId, productPresentation.id))
            .leftJoin(product, eq(productPresentation.productId, product.id))
            .where(eq(saleProduct.saleId, id));

        const saleProductIds = products.map(p => p.id);

        const optionals = saleProductIds.length > 0
            ? await db
                .select(getTableColumns(saleRecipeOptional))
                .from(saleRecipeOptional)
                .where(
                    saleProductIds.length === 1
                        ? eq(saleRecipeOptional.saleProductId, saleProductIds[0]!)
                        : inArray(saleRecipeOptional.saleProductId, saleProductIds)
                )
            : [];

        return {
            ...saleData[0],
            products: products.map(p => ({
                ...p,
                optionals: optionals.filter(o => o.saleProductId === p.id),
            })),
        };
    }
}

export const saleRepository = new SaleRepository();