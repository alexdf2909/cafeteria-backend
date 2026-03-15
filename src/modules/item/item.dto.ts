import { z } from "zod";
import {item} from "../../db/schema";

export const getItemsQuerySchema = z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(["active", "inactive", "archived"]).optional(),
    lowStock: z.coerce.boolean().optional(),
    expiringSoon: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetItemsQuery = z.infer<typeof getItemsQuerySchema>;

export const createItemSchema = z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    categoryId: z.number().int().positive(),
    baseUnitId: z.number().int().positive(),
    minStock: z.number().nonnegative().default(0),
    reorderPoint: z.number().nonnegative().default(0),
    maxStock: z.number().nonnegative().default(0),
    isPerishable: z.boolean(),
    shelfLifeDays: z.number().int().positive().optional().nullable(),
    status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export type CreateItemDto = z.infer<typeof createItemSchema>;

export const itemParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export type ItemParams = z.infer<typeof itemParamsSchema>;

export const updateItemSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    categoryId: z.number().int().positive().optional(),
    minStock: z.number().nonnegative().optional(),
    reorderPoint: z.number().nonnegative().optional(),
    maxStock: z.number().nonnegative().optional(),
    shelfLifeDays: z.number().int().positive().optional().nullable(),
    status: z.enum(["active", "inactive", "archived"]).optional(),
}).refine(
    (data) => Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined).length > 0,
    { message: "At least one field must be provided for update" }
);

export type UpdateItemDto = z.infer<typeof updateItemSchema>;

export const getItemsByCategoryQuerySchema = z.object({
    categoryId: z.number().int().positive(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetItemsByCategoryQuery = z.infer<typeof getItemsByCategoryQuerySchema>;