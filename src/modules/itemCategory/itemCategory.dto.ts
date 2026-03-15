import { z } from "zod";

export const getItemCategoriesQuerySchema = z.object({
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetItemCategoriesQuery = z.infer<typeof getItemCategoriesQuerySchema>;

export const createItemCategorySchema = z.object({
    name: z.string().min(1).max(50),
});

export type CreateItemCategoryDto = z.infer<typeof createItemCategorySchema>;

export const itemCategoryParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export type ItemCategoryParams = z.infer<typeof itemCategoryParamsSchema>;

export const updateItemCategorySchema = z
    .object({
        name: z.string().min(1).max(50).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

export type UpdateItemCategoryDto = z.infer<
    typeof updateItemCategorySchema
>;

