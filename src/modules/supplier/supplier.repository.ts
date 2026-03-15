import {BaseRepository} from "../../common/db/base.repository";
import {item, itemPackage, itemSupplier, NewSupplier, supplier} from "../../db/schema";
import {GetSuppliersByItemPackage, GetSuppliersQuery, UpdateSupplierDto} from "./supplier.dto";
import {buildPagination} from "../../common/http/pagination.helpers";
import {buildWhereClause, countRows} from "../../common/db/db.helpers";
import {and, desc, eq, getTableColumns, ilike, or} from "drizzle-orm";
import {db} from "../../db";

export class SupplierRepository extends BaseRepository<typeof supplier, NewSupplier, UpdateSupplierDto, number>{
    constructor(){
        super(supplier, supplier.id, "Supplier");
    }

    async getSuppliers(query: GetSuppliersQuery) {
        const { search, active, page, limit } = query;

        const { currentPage, limitPerPage, offset } =
            buildPagination(page, limit);

        const whereClause = buildWhereClause([
            search ? or(ilike(supplier.name, `%${search}%`)) : undefined,
            active !== undefined ? eq(supplier.active, active) : undefined,
        ]);

        const total = await countRows(supplier, whereClause);

        const data = await db
            .select(getTableColumns(supplier))
            .from(supplier)
            .where(whereClause)
            .orderBy(desc(supplier.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        return {
            data,
            total,
            currentPage,
            limitPerPage,
        };
    }

    async countItemPackages(supplierId: number) {
        return countRows(
            itemSupplier,
            and(
                eq(itemSupplier.supplierId, supplierId),
                eq(itemSupplier.active, true)
            )
        );
    }

    async getSuppliersByItemPackage(query: GetSuppliersByItemPackage) {
        const { itemPackageId, page, limit } = query;
        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const whereClause = buildWhereClause([
            eq(itemSupplier.itemPackageId, itemPackageId),
            eq(itemSupplier.active, true),
            eq(supplier.active, true),
        ]);

        const total = await countRows(itemSupplier, eq(itemSupplier.itemPackageId, itemPackageId));

        const data = await db
            .select({ ...getTableColumns(supplier) })
            .from(supplier)
            .innerJoin(itemSupplier, eq(itemSupplier.supplierId, supplier.id))
            .where(whereClause)
            .orderBy(desc(supplier.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        return { data, total, currentPage, limitPerPage };
    }
}

export const supplierRepository = new SupplierRepository();