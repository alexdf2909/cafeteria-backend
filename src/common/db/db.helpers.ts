import { and, eq, count, SQL } from "drizzle-orm";
import { db } from "../../db";
import { conflict } from "../../errors/error.helpers";

export async function countRows(table: any, whereClause?: SQL): Promise<number> {
    const result = whereClause
        ? await db.select({ count: count() }).from(table).where(whereClause)
        : await db.select({ count: count() }).from(table);

    return Number(result[0]?.count ?? 0);
}

export async function exists(table: any, whereClause?: SQL): Promise<boolean> {
    const total = await countRows(table, whereClause);
    return total > 0;
}

export async function ensureUnique(
    table: any,
    whereClause?: SQL,
    message = "Duplicate record"
) {
    const total = await countRows(table, whereClause);
    if (total > 0) {
        throw conflict(message);
    }
}

export async function ensureNotInUse(
    table: any,
    whereClause: SQL,
    message = "Record is in use"
) {
    const total = await countRows(table, whereClause);
    if (total > 0) {
        throw conflict(message);
    }
}

export function buildWhereClause(filters: (SQL | undefined)[]) {
    const validFilters = filters.filter((f): f is SQL => f !== undefined);
    return validFilters.length > 0 ? and(...validFilters) : undefined;
}