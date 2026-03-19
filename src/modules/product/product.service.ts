import {
    CreateProductDto,
    CreatePresentationDto,
    GetProductsQuery,
    UpdateProductDto,
    UpdatePresentationDto,
} from "./product.dto";
import { productRepository } from "./product.repository";
import { buildPaginationMeta } from "../../common/http/pagination.helpers";
import { ensureUnique } from "../../common/db/db.helpers";
import { badRequest, notFound } from "../../errors/error.helpers";
import {item, product, productPresentation, recipe, recipeItem} from "../../db/schema";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import {RecipeItemDto} from "../recipe/recipe.dto";

// ─── Product ─────────────────────────────────────────────────────────────────
async function validateRecipeItems(items: RecipeItemDto[]) {
    for (const recipeItemData of items) {
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
}

export async function getProductsService(query: GetProductsQuery) {
    const result = await productRepository.getProducts(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(result.currentPage, result.limitPerPage, result.total),
    };
}

export async function getProductByIdService(productId: number) {
    const result = await productRepository.findByIdWithPresentations(productId);

    if (!result) throw notFound("Product");

    return result;
}

export async function createProductService(data: CreateProductDto) {
    await ensureUnique(
        product,
        eq(product.sku, data.sku),
        "SKU already exists"
    );

    // Validar items de todas las presentaciones
    for (const presentation of data.presentations) {
        await validateRecipeItems(presentation.items);
    }

    const { presentations, ...productData } = data;

    return await db.transaction(async (tx) => {
        // Crear producto
        const productResult = await tx
            .insert(product)
            .values(productData)
            .returning();

        const newProduct = productResult[0];
        if (!newProduct) throw new Error("Failed to create product");

        // Crear presentaciones con sus recetas
        const createdPresentations = await Promise.all(
            presentations.map(async (p) => {
                const { items, ...presentationData } = p;

                const presentationResult = await tx
                    .insert(productPresentation)
                    .values({ ...presentationData, productId: newProduct.id })
                    .returning();

                const newPresentation = presentationResult[0];
                if (!newPresentation) throw new Error("Failed to create presentation");

                const recipeResult = await tx
                    .insert(recipe)
                    .values({
                        productPresentationId: newPresentation.id,
                        version: 1,
                        isActive: true,
                    })
                    .returning();

                const newRecipe = recipeResult[0];
                if (!newRecipe) throw new Error("Failed to create recipe");

                const createdItems = await Promise.all(
                    items.map(i =>
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
                    ...newPresentation,
                    recipe: {
                        ...newRecipe,
                        items: createdItems.map(r => r[0]),
                    },
                };
            })
        );

        return {
            ...newProduct,
            presentations: createdPresentations,
        };
    });
}

export async function updateProductService(productId: number, data: UpdateProductDto) {
    await productRepository.findByIdOrFail(productId);
    return productRepository.update(productId, data);
}

// ─── Product Presentation ────────────────────────────────────────────────────

export async function getPresentationByIdService(presentationId: number) {
    const result = await productRepository.findPresentationById(presentationId);
    if (!result) throw notFound("Presentation");
    return result;
}

export async function createPresentationService(productId: number, data: CreatePresentationDto) {
    await productRepository.findByIdOrFail(productId);

    // Validar items de la receta
    await validateRecipeItems(data.items);

    const { items, ...presentationData } = data;

    return await db.transaction(async (tx) => {
        // Crear presentación
        const presentationResult = await tx
            .insert(productPresentation)
            .values({ ...presentationData, productId })
            .returning();

        const newPresentation = presentationResult[0];
        if (!newPresentation) throw new Error("Failed to create presentation");

        // Crear receta versión 1
        const recipeResult = await tx
            .insert(recipe)
            .values({
                productPresentationId: newPresentation.id,
                version: 1,
                isActive: true,
            })
            .returning();

        const newRecipe = recipeResult[0];
        if (!newRecipe) throw new Error("Failed to create recipe");

        // Crear items de la receta
        const createdItems = await Promise.all(
            items.map(i =>
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
            ...newPresentation,
            recipe: {
                ...newRecipe,
                items: createdItems.map(r => r[0]),
            },
        };
    });
}

export async function updatePresentationService(presentationId: number, data: UpdatePresentationDto) {
    const presentation = await productRepository.findPresentationById(presentationId);

    if (!presentation) throw notFound("Presentation");

    return productRepository.updatePresentation(presentationId, data);
}