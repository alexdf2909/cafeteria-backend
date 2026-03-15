import { z } from "zod";

export const getDashboardQuerySchema = z.object({
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
});

export type GetDashboardQuery = z.infer<typeof getDashboardQuerySchema>;