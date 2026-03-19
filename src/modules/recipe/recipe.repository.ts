import { BaseRepository } from "../../common/db/base.repository";
import {item, recipe, recipeItem, productPresentation, NewRecipe, unit} from "../../db/schema";
import { GetRecipesQuery } from "./recipe.dto";
import { buildPagination } from "../../common/http/pagination.helpers";
import { buildWhereClause, countRows } from "../../common/db/db.helpers";
import { count, desc, eq, getTableColumns } from "drizzle-orm";
import { db } from "../../db";

export class RecipeRepository extends BaseRepository <
typeof recipe,
    NewRecipe,
    never,
number
> {
    constructor() {
        super(recipe, recipe.id, "Recipe");
    }

    async getRecipes(query: GetRecipesQuery) {
        const { productPresentationId, isActive, page, limit } = query;
        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const whereClause = buildWhereClause([
            productPresentationId
                ? eq(recipe.productPresentationId, productPresentationId)
                : undefined,
            isActive !== undefined ? eq(recipe.isActive, isActive) : undefined,
        ]);

        const recipes = await db
            .select(getTableColumns(recipe))
            .from(recipe)
            .where(whereClause)
            .orderBy(desc(recipe.version))
            .limit(limitPerPage)
            .offset(offset);

        // Para cada receta obtener sus items
        const recipesWithItems = await Promise.all(
            recipes.map(async (r) => {
                const items = await db
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
                    .leftJoin(unit, eq(item.baseUnitId, unit.id)) // ← agrega este join
                    .where(eq(recipeItem.recipeId, r.id));

                return { ...r, items };
            })
        );

        const countResult = await db
            .select({ count: count() })
            .from(recipe)
            .where(whereClause);

        return {
            data: recipesWithItems,
            total: Number(countResult[0]?.count ?? 0),
            currentPage,
            limitPerPage,
        };
    }

    async findByIdWithItems(id: number) {
        const recipeData = await db
            .select({
                ...getTableColumns(recipe),
                presentation: {
                    id: productPresentation.id,
                    name: productPresentation.name,
                    price: productPresentation.price,
                },
            })
            .from(recipe)
            .leftJoin(productPresentation, eq(recipe.productPresentationId, productPresentation.id))
            .where(eq(recipe.id, id));

        if (!recipeData[0]) return null;

        const items = await db
            .select({
                ...getTableColumns(recipeItem),
                item: {
                    id: item.id,
                    name: item.name,
                    sku: item.sku,
                },
            })
            .from(recipeItem)
            .leftJoin(item, eq(recipeItem.itemId, item.id))
            .where(eq(recipeItem.recipeId, id));

        return {
            ...recipeData[0],
            items,
        };
    }

    async findActiveByPresentation(presentationId: number) {
        return this.findOne(
            eq(recipe.productPresentationId, presentationId)
        );
    }

    async deactivateByPresentation(presentationId: number) {
        await db
            .update(recipe)
            .set({ isActive: false })
            .where(eq(recipe.productPresentationId, presentationId));
    }

    async getNextVersion(presentationId: number) {
        const result = await db
            .select({ version: recipe.version })
            .from(recipe)
            .where(eq(recipe.productPresentationId, presentationId))
            .orderBy(desc(recipe.version))
            .limit(1);

        return (result[0]?.version ?? 0) + 1;
    }
}

export const recipeRepository = new RecipeRepository();