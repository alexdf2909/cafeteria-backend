import { z } from "zod";

export const getUsersQuerySchema = z.object({
    search: z.string().optional(),
    role: z.enum(["empleado", "admin"]).optional(),
    active: z.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;

export const createUserSchema = z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["empleado", "admin"]),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

export const userParamsSchema = z.object({
    id: z.string().min(1),
});

export type UserParams = z.infer<typeof userParamsSchema>;

export const updateUserSchema = z.object({
    name: z.string().min(2).max(50).optional(),
    role: z.enum(["empleado", "admin"]).optional(),
    active: z.boolean().optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided" }
);

export type UpdateUserDto = z.infer<typeof updateUserSchema>;



