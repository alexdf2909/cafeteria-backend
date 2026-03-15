import { CreateRecipeDto, GetRecipesQuery } from "./recipe.dto";
import { recipeRepository } from "./recipe.repository";
import { buildPaginationMeta } from "../../common/http/pagination.helpers";
import { notFound, badRequest } from "../../errors/error.helpers";
import { productRepository } from "../product/product.repository";
import { item, recipe, recipeItem } from "../../db/schema";
import { eq } from "drizzle-orm";
import { db } from "../../db";

export async function getRecipesService(query: GetRecipesQuery) {
    const result = await recipeRepository.getRecipes(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(result.currentPage, result.limitPerPage, result.total),
    };
}

export async function getRecipeByIdService(recipeId: number) {
    const result = await recipeRepository.findByIdWithItems(recipeId);
    if (!result) throw notFound("Recipe");
    return result;
}

export async function createRecipeService(data: CreateRecipeDto) {
    // 1. Verificar que la presentación existe y está disponible
    const presentation = await productRepository.findPresentationById(data.productPresentationId);
    if (!presentation) throw notFound("Product presentation");
    if (!presentation.isAvailable) {
        throw badRequest("Cannot create recipe for an unavailable presentation");
    }

    // 2. Verificar que todos los items existen y están activos
    for (const recipeItemData of data.items) {
        const itemData = await db
            .select()
            .from(item)
            .where(eq(item.id, recipeItemData.itemId))
            .limit(1);

        if (!itemData[0]) {
            throw badRequest(`Item ${recipeItemData.itemId} not found`);
        }

        if (itemData[0].status !== "active") {
            throw badRequest(`Item "${itemData[0].name}" is not active`);
        }
    }

    // 3. Calcular siguiente versión
    const nextVersion = await recipeRepository.getNextVersion(data.productPresentationId);

    // 4. Crear todo en transacción
    return await db.transaction(async (tx) => {

        // 4.1 Desactivar receta anterior si existe
        await tx
            .update(recipe)
            .set({ isActive: false })
            .where(eq(recipe.productPresentationId, data.productPresentationId));

        // 4.2 Crear nueva receta
        const result = await tx
            .insert(recipe)
            .values({
                productPresentationId: data.productPresentationId,
                version: nextVersion,
                isActive: true,
            })
            .returning();

        const newRecipe = result[0];
        if (!newRecipe) throw new Error("Failed to create recipe");

        // 4.3 Crear items de la receta
        const createdItems = await Promise.all(
            data.items.map(i =>
                tx.insert(recipeItem)
                    .values({
                        recipeId: newRecipe.id,
                        itemId: i.itemId,
                        quantity: i.quantity,
                        isOptional: i.isOptional,
                        optionalType: i.optionalType ?? null,
                        extraPrice: i.extraPrice ?? null,
                    })
                    .returning()
            )
        );

        return {
            ...newRecipe,
            items: createdItems.map(r => r[0]),
        };
    });

}

export async function getActiveRecipeByPresentationService(presentationId: number) {
    const presentation = await productRepository.findPresentationById(presentationId);
    if (!presentation) throw notFound("Presentation");

    const activeRecipe = await recipeRepository.findActiveByPresentation(presentationId);
    if (!activeRecipe) throw notFound("Active recipe for this presentation");

    return recipeRepository.findByIdWithItems(activeRecipe.id);
}