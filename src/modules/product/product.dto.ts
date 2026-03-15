import { z } from "zod";
import {recipeItemSchema} from "../recipe/recipe.dto";

// ─── Product Category ───────────────────────────────────────────────────────

export const productCategoryParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});
export type ProductCategoryParams = z.infer<typeof productCategoryParamsSchema>;

// ─── Product ─────────────────────────────────────────────────────────────────

export const getProductsQuerySchema = z.object({
    search: z.string().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    isAvailable: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});
export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>;

export const productPresentationSchema = z.object({
    name: z.string().min(1).max(30),
    price: z.number().positive(),
    isAvailable: z.boolean().default(true),
});
export type ProductPresentationDto = z.infer<typeof productPresentationSchema>;

export const createPresentationSchema = z.object({
    name: z.string().min(1).max(30),
    price: z.number().positive(),
    isAvailable: z.boolean().default(true),
    items: z.array(recipeItemSchema).min(1, "At least one recipe item is required"),
}).refine(
    (data) => {
        const ids = data.items.map(i => i.itemId);
        return new Set(ids).size === ids.length;
    },
    { message: "Duplicate itemId in recipe" }
);

export type CreatePresentationDto = z.infer<typeof createPresentationSchema>;

export const createProductSchema = z.object({
    sku: z.string().min(1).max(20),
    name: z.string().min(1).max(100),
    categoryId: z.number().int().positive(),
    isAvailable: z.boolean().default(true),
    presentations: z.array(createPresentationSchema).min(1, "At least one presentation is required"),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;

export const productParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});
export type ProductParams = z.infer<typeof productParamsSchema>;

export const updateProductSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    categoryId: z.number().int().positive().optional(),
    isAvailable: z.boolean().optional(),
}).refine(
    (data) => Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined).length > 0,
    { message: "At least one field must be provided for update" }
);
export type UpdateProductDto = z.infer<typeof updateProductSchema>;

// ─── Product Presentation ────────────────────────────────────────────────────

export const presentationParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});
export type PresentationParams = z.infer<typeof presentationParamsSchema>;

export const updatePresentationSchema = z.object({
    name: z.string().min(1).max(30).optional(),
    price: z.number().positive().optional(),
    isAvailable: z.boolean().optional(),
}).refine(
    (data) => Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined).length > 0,
    { message: "At least one field must be provided for update" }
);
export type UpdatePresentationDto = z.infer<typeof updatePresentationSchema>;