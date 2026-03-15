import {z} from "zod";

export const getItemPackagesByItemQuerySchema = z.object({
    itemId: z.number().int().positive(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetItemPackagesByItemQuery = z.infer<typeof getItemPackagesByItemQuerySchema>;

export const getItemPackagesBySupplierQuerySchema = z.object({
    supplierId: z.number().int().positive(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetItemPackagesBySupplierQuery = z.infer<typeof getItemPackagesBySupplierQuerySchema>;

export const createItemPackageSchema = z.object({
    itemId: z.number().int().positive(),
    packageName: z.string().min(1).max(50),
    packageUnitId: z.number().int().positive(),
    packageQuantity: z.number().int().positive(),
    barcode: z.string().min(1).max(50)
});

export type CreateItemPackageDto = z.infer<typeof createItemPackageSchema>;

export const itemPackageParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
})

export type ItemPackageParams = z.infer<typeof itemPackageParamsSchema>;

export const updateItemPackageSchema = z.object({
    packageName: z.string().min(1).max(50).optional(),
    barcode: z.string().min(1).max(50).optional(),
}).refine(
    (data) => Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined).length > 0,
    { message: "At least one field must be provided for update" }
);

export type UpdateItemPackageDto = z.infer<typeof updateItemPackageSchema>;