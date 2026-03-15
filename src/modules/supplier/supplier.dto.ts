import {z} from "zod";

export const getSuppliersQuerySchema = z.object({
    search: z.string().optional(),
    active: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});
export type GetSuppliersQuery = z.infer<typeof getSuppliersQuerySchema>;

export const createSupplierSchema = z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    contactInfo: z.string().optional().nullable(),
});

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;

export const supplierParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
})

export type SupplierParams = z.infer<typeof supplierParamsSchema>;

export const updateSupplierSchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    contactInfo: z.string().optional().nullable(),
    active: z.boolean().optional(), // ← agregar
}).refine(
    (data) => Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined).length > 0,
    { message: "At least one field must be provided for update" }
);

export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>;

export const getSuppliersByItemPackageQuerySchema = z.object({
    itemPackageId: z.number().int().positive(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetSuppliersByItemPackage = z.infer<typeof getSuppliersByItemPackageQuerySchema>;