import { z } from "zod";

export const recipeItemSchema = z.object({
    itemId: z.number().int().positive(),
    quantity: z.number().positive(),
    isOptional: z.boolean().default(false),
    optionalType: z.enum(["exclude", "extra"]).optional().nullable(),
    extraPrice: z.number().positive().optional().nullable(),
}).refine(
    (data) => {
        // Si es opcional debe tener optionalType
        if (data.isOptional && !data.optionalType) return false;
        // Si no es opcional no debe tener optionalType ni extraPrice
        if (!data.isOptional && data.optionalType) return false;
        // Si es extra debe tener extraPrice
        if (data.optionalType === "extra" && !data.extraPrice) return false;
        return true;
    },
    { message: "Invalid optional item configuration" }
);

export type RecipeItemDto = z.infer<typeof recipeItemSchema>;

export const createRecipeSchema = z.object({
    productPresentationId: z.number().int().positive(),
    items: z.array(recipeItemSchema).min(1, "At least one item is required"),
}).refine(
    (data) => {
        const ids = data.items.map(i => i.itemId);
        return new Set(ids).size === ids.length;
    },
    { message: "Duplicate itemId in recipe" }
);

export type CreateRecipeDto = z.infer<typeof createRecipeSchema>;

export const recipeParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export type RecipeParams = z.infer<typeof recipeParamsSchema>;

export const getRecipesQuerySchema = z.object({
    productPresentationId: z.coerce.number().int().positive().optional(),
    isActive: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetRecipesQuery = z.infer<typeof getRecipesQuerySchema>;