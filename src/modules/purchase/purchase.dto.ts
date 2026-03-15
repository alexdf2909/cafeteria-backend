import { z } from "zod";

export const purchaseItemSchema = z.object({
    itemPackageId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    unitCost: z.number().positive(),
    batchNumber: z.string().min(1).max(50),
    expirationDate: z.coerce.date().optional().nullable(),
    location: z.enum(["warehouse", "sales_module"]).default("warehouse"),
});

export type PurchaseItemDto = z.infer<typeof purchaseItemSchema>;

export const createPurchaseSchema = z.object({
    supplierId: z.number().int().positive(),
    purchaseDate: z.coerce.date(),
    notes: z.string().optional().nullable(),
    items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
}).refine(
    (data) => {
        const ids = data.items.map(i => i.itemPackageId);
        return new Set(ids).size === ids.length;
    },
    { message: "Duplicate itemPackageId in items" }
);

export type CreatePurchaseDto = z.infer<typeof createPurchaseSchema>;

export const purchaseParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export type PurchaseParams = z.infer<typeof purchaseParamsSchema>;

export const getPurchasesQuerySchema = z.object({
    supplierId: z.coerce.number().int().positive().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetPurchasesQuery = z.infer<typeof getPurchasesQuerySchema>;