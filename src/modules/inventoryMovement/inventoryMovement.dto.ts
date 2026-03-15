import { z } from "zod";

export const transferSchema = z.object({
    itemId: z.number().int().positive(),
    quantity: z.number().positive(),
    fromLocation: z.enum(["warehouse", "sales_module"]),
    toLocation: z.enum(["warehouse", "sales_module"]),
    notes: z.string().optional().nullable(),
    movementDate: z.coerce.date(),
}).refine(
    (data) => data.fromLocation !== data.toLocation,
    { message: "Origin and destination must be different" }
);
export type TransferDto = z.infer<typeof transferSchema>;

export const adjustmentSchema = z.object({
    lotId: z.number().int().positive(),
    location: z.enum(["warehouse", "sales_module"]),
    newQuantity: z.number().nonnegative(),
    notes: z.string().min(1, "Notes are required for adjustments"),
    movementDate: z.coerce.date(),
});
export type AdjustmentDto = z.infer<typeof adjustmentSchema>;

export const damageSchema = z.object({
    lotId: z.number().int().positive(),
    location: z.enum(["warehouse", "sales_module"]),
    quantity: z.number().positive(),
    notes: z.string().min(1, "Notes are required for damage"),
    movementDate: z.coerce.date(),
});
export type DamageDto = z.infer<typeof damageSchema>;

export const expirationSchema = z.object({
    alertId: z.number().int().positive(),
    notes: z.string().optional().nullable(),
    movementDate: z.coerce.date(),
});
export type ExpirationDto = z.infer<typeof expirationSchema>;

export const getMovementsQuerySchema = z.object({
    itemId: z.coerce.number().int().positive().optional(),
    lotId: z.coerce.number().int().positive().optional(),
    movementType: z.enum(["purchase", "transfer", "consumption", "adjustment", "expiration", "damage"]).optional(),
    location: z.enum(["warehouse", "sales_module"]).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});
export type GetMovementsQuery = z.infer<typeof getMovementsQuerySchema>;

export const movementParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});
export type MovementParams = z.infer<typeof movementParamsSchema>;