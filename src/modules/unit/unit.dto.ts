import { z } from "zod";

export const getUnitsQuerySchema = z.object({
    search: z.string().trim().optional(),
    unitType: z.enum(["mass", "volume", "count"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetUnitsQuery = z.infer<typeof getUnitsQuerySchema>;

export const createUnitSchema = z.object({
    name: z.string().trim().min(1).max(20),
    symbol: z.string().trim().min(1).max(10),
    unitType: z.enum(["mass", "volume", "count"]),
    toBaseFactor: z.number().positive(),
    isBase: z.boolean().default(false),
});

export type CreateUnitDto = z.infer<typeof createUnitSchema>;

export const unitParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export type UnitParams = z.infer<typeof unitParamsSchema>;

export const updateUnitSchema = z
    .object({
        name: z.string().trim().min(1).optional(),
        symbol: z.string().trim().min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    });

export type UpdateUnitDto = z.infer<typeof updateUnitSchema>;

