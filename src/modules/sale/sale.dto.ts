import { z } from "zod";
import { recipeItemSchema } from "../recipe/recipe.dto";

// ─── Sale Optional Item ───────────────────────────────────────────────────────

export const saleOptionalItemSchema = z.object({
    recipeItemId: z.number().int().positive(),
    quantity: z.number().int().positive().default(1),
});

export type SaleOptionalItemDto = z.infer<typeof saleOptionalItemSchema>;

// ─── Sale Product ─────────────────────────────────────────────────────────────

export const saleProductSchema = z.object({
    recipeId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    optionals: z.array(saleOptionalItemSchema).default([]),
});

export type SaleProductDto = z.infer<typeof saleProductSchema>;

// ─── Sale ─────────────────────────────────────────────────────────────────────

export const createSaleSchema = z.object({
    saleDate: z.coerce.date(),
    notes: z.string().optional().nullable(),
    products: z.array(saleProductSchema).min(1, "At least one product is required"),
});

export type CreateSaleDto = z.infer<typeof createSaleSchema>;

export const saleParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export type SaleParams = z.infer<typeof saleParamsSchema>;

export const getSalesQuerySchema = z.object({
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetSalesQuery = z.infer<typeof getSalesQuerySchema>;