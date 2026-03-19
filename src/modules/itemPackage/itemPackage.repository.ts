import {BaseRepository} from "../../common/db/base.repository";
import {item, itemPackage, itemSupplier, NewItemPackage, supplier, unit} from "../../db/schema";
import {
    GetItemPackagesByItemQuery,
    GetItemPackagesBySupplierQuery,
    GetItemPackagesQuery,
    UpdateItemPackageDto
} from "./itemPackage.dto";
import {buildPagination} from "../../common/http/pagination.helpers";
import {countRows} from "../../common/db/db.helpers";
import {count, desc, eq, getTableColumns} from "drizzle-orm";
import {db} from "../../db";

export class ItemPackageRepository extends BaseRepository<typeof itemPackage, NewItemPackage, UpdateItemPackageDto, number> {
    constructor() {
        super(itemPackage, itemPackage.id, "Item Package");
    }

    async getItemPackages(query: GetItemPackagesQuery) {
        const { page, limit } = query;
        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const [data, countResult] = await Promise.all([
            db
                .select({
                    ...getTableColumns(itemPackage),
                    item: {
                        id: item.id,
                        name: item.name,
                        sku: item.sku,
                    },
                    packageUnit: {
                        name: unit.name,
                        symbol: unit.symbol,
                    },
                })
                .from(itemPackage)
                .innerJoin(item, eq(itemPackage.itemId, item.id))
                .leftJoin(unit, eq(itemPackage.packageUnitId, unit.id))
                .orderBy(desc(itemPackage.createdAt))
                .limit(limitPerPage)
                .offset(offset),
            db.select({ count: count() }).from(itemPackage),
        ]);

        return {
            data,
            total: Number(countResult[0]?.count ?? 0),
            currentPage,
            limitPerPage,
        };
    }

    async findByIdWithDetails(id: number) {
        const result = await db
            .select({
                ...getTableColumns(itemPackage),
                packageUnit: {
                    name: unit.name,
                    symbol: unit.symbol,
                },
                item: {
                    id: item.id,
                    name: item.name,
                    isPerishable: item.isPerishable,
                },
            })
            .from(itemPackage)
            .leftJoin(unit, eq(itemPackage.packageUnitId, unit.id))
            .innerJoin(item, eq(itemPackage.itemId, item.id))
            .where(eq(itemPackage.id, id));

        return result[0] ?? null;
    }

    async getItemPackagesByItem(query: GetItemPackagesByItemQuery) {
        const { itemId, page, limit } = query;
        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const total = await countRows(itemPackage, eq(itemPackage.itemId, itemId));

        const data = await db
            .select({
                ...getTableColumns(itemPackage),
                packageUnit: {
                    name: unit.name,
                    symbol: unit.symbol,
                },
            })
            .from(itemPackage)
            .leftJoin(unit, eq(itemPackage.packageUnitId, unit.id))
            .where(eq(itemPackage.itemId, itemId))
            .orderBy(desc(itemPackage.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        return {
            data,
            total,
            currentPage,
            limitPerPage,
        };
    }

    async getItemPackagesBySupplier(query: GetItemPackagesBySupplierQuery) {
        const { supplierId, page, limit } = query;
        const { currentPage, limitPerPage, offset } = buildPagination(page, limit);

        const total = await db
            .select({ count: count() })
            .from(itemPackage)
            .innerJoin(itemSupplier, eq(itemPackage.id, itemSupplier.itemPackageId))
            .where(eq(itemSupplier.supplierId, supplierId));

        const totalCount = Number(total[0]?.count ?? 0);

        const data = await db
            .select({
                ...getTableColumns(itemPackage),
                item: {
                    name: item.name,
                    sku: item.sku,
                    isPerishable: item.isPerishable,
                },
                packageUnit: {
                    name: unit.name,
                    symbol: unit.symbol,
                },
            })
            .from(itemPackage)
            .innerJoin(itemSupplier, eq(itemPackage.id, itemSupplier.itemPackageId))
            .innerJoin(item, eq(itemPackage.itemId, item.id))
            .leftJoin(unit, eq(itemPackage.packageUnitId, unit.id))
            .where(eq(itemSupplier.supplierId, supplierId))
            .orderBy(desc(itemPackage.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        return { data, total: totalCount, currentPage, limitPerPage };
    }

}

export const itemPackageRepository  = new ItemPackageRepository();