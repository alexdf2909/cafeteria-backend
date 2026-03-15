import { z } from "zod";

export const inventoryCountLineSchema = z.object({
    itemId: z.number().int().positive(),
    countedQuantity: z.number().nonnegative(),
});

export type InventoryCountLineDto = z.infer<typeof inventoryCountLineSchema>;

export const createInventoryCountSchema = z.object({
    countDate: z.coerce.date(),
    location: z.enum(["warehouse", "sales_module"]),
    lines: z.array(inventoryCountLineSchema).min(1, "At least one line is required"),
}).refine(
    (data) => {
        const ids = data.lines.map(l => l.itemId);
        return new Set(ids).size === ids.length;
    },
    { message: "Duplicate itemId in count lines" }
);

export type CreateInventoryCountDto = z.infer<typeof createInventoryCountSchema>;

export const inventoryCountParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export type InventoryCountParams = z.infer<typeof inventoryCountParamsSchema>;

export const getInventoryCountsQuerySchema = z.object({
    location: z.enum(["warehouse", "sales_module"]).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetInventoryCountsQuery = z.infer<typeof getInventoryCountsQuerySchema>;