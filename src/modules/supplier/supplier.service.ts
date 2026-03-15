import {CreateSupplierDto, GetSuppliersQuery, UpdateSupplierDto} from "./supplier.dto";
import {supplierRepository} from "./supplier.repository";
import {buildPaginationMeta} from "../../common/http/pagination.helpers";
import {GetItemPackagesBySupplierQuery} from "../itemPackage/itemPackage.dto";
import {itemPackageRepository} from "../itemPackage/itemPackage.repository";
import {ensureUnique} from "../../common/db/db.helpers";
import {supplier} from "../../db/schema";
import {and, eq, sql} from "drizzle-orm";
import {itemSupplierRepository} from "../itemSupplier/itemSupplier.repository";
import {purchaseRepository} from "../purchase/purchase.repository";

export async function getSuppliersService(query: GetSuppliersQuery) {
    const result = await supplierRepository.getSuppliers(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(
            result.currentPage,
            result.limitPerPage,
            result.total
        ),
    };
}

export async function getSupplierByIdService(supplierId: number) {
    const supplierSelected = await supplierRepository.findByIdOrFail(supplierId);
    const itemPackagesCount = await supplierRepository.countItemPackages(supplierId);
    const recentPurchases = await purchaseRepository.getRecentBySupplier(supplierId, 5);

    return {
        ...supplierSelected,
        totals: {
            itemPackages: itemPackagesCount,
        },
        recentPurchases,
    };
}

export async function createSupplierService(data: CreateSupplierDto) {
    await ensureUnique(
        supplier,
        eq(supplier.email, data.email),
        "Email already exists"
    );
    return supplierRepository.create(data);
}

export async function updateSupplierService(supplierId: number, data: UpdateSupplierDto) {
    await supplierRepository.findByIdOrFail(supplierId);

    if (data.email) {
        await ensureUnique(
            supplier,
            and(
                eq(supplier.email, data.email),
                sql`${supplier.id} != ${supplierId}`
            ),
            "Email already exists"
        );
    }

    if (data.active === false) {
        await itemSupplierRepository.deactivateBySupplier(supplierId);
    }

    return supplierRepository.update(supplierId, data);
}

export async function getItemPackagesBySupplierService(query: GetItemPackagesBySupplierQuery) {
    await supplierRepository.findByIdOrFail(query.supplierId);

    const result = await itemPackageRepository.getItemPackagesBySupplier(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(
            result.currentPage,
            result.limitPerPage,
            result.total
        ),
    };
}



