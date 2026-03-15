import { db } from "../../db";
import { eq, count, SQL } from "drizzle-orm";
import { AnyPgTable, PgColumn } from "drizzle-orm/pg-core";
import { AppError } from "../../errors/AppError";

export abstract class BaseRepository<
    TTable extends AnyPgTable,
    TInsert extends Record<string, any>,
    TUpdate extends Record<string, any>,
    TId extends number | string
> {
    constructor(
        protected table: TTable,
        protected idColumn: PgColumn,
        protected entityName: string
    ) {}

    async findById(id: TId) {
        const result = await db
            .select()
            .from(this.table as any)
            .where(eq(this.idColumn, id));

        const rows = result as any[];

        return rows[0] ?? null;
    }

    async findByIdOrFail(id: TId) {
        const entity = await this.findById(id);

        if (!entity) {
            throw new AppError(`${this.entityName} not found`, 404);
        }

        return entity;
    }

    async findAll() {
        const result = await db
            .select()
            .from(this.table as any);

        return result as any[];
    }

    async findMany(
        options?: {
            where?: SQL;
            limit?: number;
            offset?: number;
        }
    ) {
        let query = db
            .select()
            .from(this.table as any)
            .$dynamic();

        if (options?.where) {
            query = query.where(options.where);
        }

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        if (options?.offset) {
            query = query.offset(options.offset);
        }

        const result = await query;

        return result as any[];
    }

    async count(where?: SQL) {
        const result = await db
            .select({ count: count() })
            .from(this.table as any)
            .where(where);

        return Number(result[0]?.count ?? 0);
    }

    async exists(where: SQL) {
        const result = await this.findMany({
            where,
            limit: 1
        });

        return result.length > 0;
    }

    async findOne(where: SQL) {
        const result = await this.findMany({
            where,
            limit: 1
        });

        return result[0] ?? null;
    }

    async create(data: TInsert) {
        const result = await db
            .insert(this.table)
            .values(data)
            .returning();

        const rows = result as any[];

        return rows[0];
    }

    async update(id: TId, data: TUpdate) {
        const result = await db
            .update(this.table)
            .set(data)
            .where(eq(this.idColumn, id))
            .returning();

        return (result as any[])[0];
    }

    async delete(id: TId) {
        const result = await db
            .delete(this.table)
            .where(eq(this.idColumn, id))
            .returning();

        if (result.length === 0) {
            throw new AppError(`${this.entityName} not found`, 404);
        }

        return true;
    }
}