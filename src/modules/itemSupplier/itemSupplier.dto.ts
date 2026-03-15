import { z } from "zod";

export const createItemSupplierSchema = z.object({
    itemPackageId: z.number().int().positive(),
    supplierId: z.number().int().positive(),
    supplierCode: z.string().max(50).optional().nullable(),
    preferred: z.boolean().default(false),
    lastUnitCost: z.number().positive(),
});

export type CreateItemSupplierDto = z.infer<typeof createItemSupplierSchema>;

export const itemSupplierParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export type ItemSupplierParams = z.infer<typeof itemSupplierParamsSchema>;

export const updateItemSupplierSchema = z.object({
    supplierCode: z.string().max(50).optional().nullable(),
    preferred: z.boolean().optional(),
    active: z.boolean().optional(),
}).refine(
    (data) => Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined).length > 0,
    { message: "At least one field must be provided for update" }
);

export type UpdateItemSupplierDto = z.infer<typeof updateItemSupplierSchema>;