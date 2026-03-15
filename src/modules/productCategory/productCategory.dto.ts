import { z } from "zod";

export const getProductCategoriesQuerySchema = z.object({
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetProductCategoriesQuery = z.infer<typeof getProductCategoriesQuerySchema>;

export const createProductCategorySchema = z.object({
    name: z.string().min(1).max(50),
});

export type CreateProductCategoryDto = z.infer<typeof createProductCategorySchema>;

export const productCategoryParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export type ProductCategoryParams = z.infer<typeof productCategoryParamsSchema>;

export const updateProductCategorySchema = z
    .object({
        name: z.string().min(1).max(50).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

export type UpdateProductCategoryDto = z.infer<
    typeof updateProductCategorySchema
>;