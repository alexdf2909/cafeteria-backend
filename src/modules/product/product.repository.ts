import { BaseRepository } from "../../common/db/base.repository";
import {
    item,
    itemCategory,
    NewProduct,
    product,
    productCategory,
    productPresentation,
    recipe, recipeItem,
    unit
} from "../../db/schema";
import {
    CreatePresentationDto, GetProductsByCategoryQuery,
    GetProductsQuery,
    UpdatePresentationDto,
    UpdateProductDto,
} from "./product.dto";
import { buildPagination } from "../../common/http/pagination.helpers";
import { buildWhereClause, countRows } from "../../common/db/db.helpers";
import {and, count, desc, eq, getTableColumns, ilike, or} from "drizzle-orm";
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

        // Para cada presentación, obtener su receta activa con items
        const presentationsWithRecipes = await Promise.all(
            presentations.map(async (pres) => {
                const activeRecipe = await db
                    .select(getTableColumns(recipe))
                    .from(recipe)
                    .where(
                        and(
                            eq(recipe.productPresentationId, pres.id),
                            eq(recipe.isActive, true)
                        )
                    )
                    .limit(1);

                if (!activeRecipe[0]) return { ...pres, recipe: null };

                const recipeItems = await db
                    .select({
                        ...getTableColumns(recipeItem),
                        item: {
                            id: item.id,
                            name: item.name,
                            sku: item.sku,
                        },
                        unit: {
                            symbol: unit.symbol, // ← agrega esto
                        },
                    })
                    .from(recipeItem)
                    .leftJoin(item, eq(recipeItem.itemId, item.id))
                    .leftJoin(unit, eq(item.baseUnitId, unit.id))
                    .where(eq(recipeItem.recipeId, activeRecipe[0].id));

                return {
                    ...pres,
                    recipe: {
                        ...activeRecipe[0],
                        items: recipeItems,
                    },
                };
            })
        );

        return {
            ...productData[0],
            presentations: presentationsWithRecipes,
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

    async getProductsByCategory(query: GetProductsByCategoryQuery) {
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
}

export const productRepository = new ProductRepository();