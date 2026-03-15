import { BaseRepository } from "../../common/db/base.repository";
import {NewProduct, product, productCategory, productPresentation} from "../../db/schema";
import {
    CreatePresentationDto,
    GetProductsQuery,
    UpdatePresentationDto,
    UpdateProductDto,
} from "./product.dto";
import { buildPagination } from "../../common/http/pagination.helpers";
import { buildWhereClause, countRows } from "../../common/db/db.helpers";
import { count, desc, eq, getTableColumns, ilike, or } from "drizzle-orm";
import { db } from "../../db";

export class ProductRepository extends BaseRepository <
typeof product,
    NewProduct,
    UpdateProductDto,
number
> {
    constructor() {
        super(product, product.id, "Product");
    }

    async getProducts(query: GetProductsQuery) {
        const { search, categoryId, isAvailable, page, limit } = query;
        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const whereClause = buildWhereClause([
            search
                ? or(
                    ilike(product.name, `%${search}%`),
                    ilike(product.sku, `%${search}%`)
                )
                : undefined,
            categoryId ? eq(product.categoryId, categoryId) : undefined,
            isAvailable !== undefined ? eq(product.isAvailable, isAvailable) : undefined,
        ]);

        const [data, countResult] = await Promise.all([
            db
                .select({
                    ...getTableColumns(product),
                    category: {
                        id: productCategory.id,
                        name: productCategory.name,
                    },
                })
                .from(product)
                .leftJoin(productCategory, eq(product.categoryId, productCategory.id))
                .where(whereClause)
                .orderBy(desc(product.createdAt))
                .limit(limitPerPage)
                .offset(offset),
            db
                .select({ count: count() })
                .from(product)
                .where(whereClause),
        ]);

        return {
            data,
            total: Number(countResult[0]?.count ?? 0),
            currentPage,
            limitPerPage,
        };
    }

    async findByIdWithPresentations(id: number) {
        const productData = await db
            .select({
                ...getTableColumns(product),
                category: {
                    id: productCategory.id,
                    name: productCategory.name,
                },
            })
            .from(product)
            .leftJoin(productCategory, eq(product.categoryId, productCategory.id))
            .where(eq(product.id, id));

        if (!productData[0]) return null;

        const presentations = await db
            .select(getTableColumns(productPresentation))
            .from(productPresentation)
            .where(eq(productPresentation.productId, id))
            .orderBy(productPresentation.name);

        return {
            ...productData[0],
            presentations,
        };
    }

    // ─── Presentation methods ────────────────────────────────────────────────

    async createPresentation(productId: number, data: CreatePresentationDto) {
        const result = await db
            .insert(productPresentation)
            .values({ ...data, productId })
            .returning();

        return result[0];
    }

    async findPresentationById(id: number) {
        const result = await db
            .select(getTableColumns(productPresentation))
            .from(productPresentation)
            .where(eq(productPresentation.id, id));

        return result[0] ?? null;
    }

    async updatePresentation(id: number, data: UpdatePresentationDto) {
        const result = await db
            .update(productPresentation)
            .set(data)
            .where(eq(productPresentation.id, id))
            .returning();

        return result[0];
    }

    async countPresentations(productId: number) {
        return countRows(productPresentation, eq(productPresentation.productId, productId));
    }
}

export const productRepository = new ProductRepository();