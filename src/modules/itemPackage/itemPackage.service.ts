import {itemPackageRepository} from "./itemPackage.repository";
import {itemRepository} from "../item/item.repository";
import {CreateItemPackageDto, UpdateItemPackageDto} from "./itemPackage.dto";
import {ensureUnique} from "../../common/db/db.helpers";
import {item, itemPackage} from "../../db/schema";
import {and, eq, sql} from "drizzle-orm";
import {unitRepository} from "../unit/unit.repository";
import {badRequest} from "../../errors/error.helpers";
import {GetSuppliersByItemPackage} from "../supplier/supplier.dto";
import {supplierRepository} from "../supplier/supplier.repository";
import {buildPaginationMeta} from "../../common/http/pagination.helpers";

export async function getItemPackageByIdService(itemPackageId: number) {
    await itemPackageRepository.findByIdOrFail(itemPackageId);

    return await itemRepository.findByIdWithDetails(itemPackageId);
}

export async function createItemPackageService(data: CreateItemPackageDto) {
    const itemSelected = await itemRepository.findByIdOrFail(data.itemId);

    await ensureUnique(
        itemPackage,
        eq(itemPackage.barcode, data.barcode),
        "Barcode already exists"
    );

    const packageUnit = await unitRepository.findByIdOrFail(data.packageUnitId);

    const baseUnitQuantity = data.packageQuantity * packageUnit.toBaseFactor;

    // El item debe estar activo para agregarle packages
    if (itemSelected.status !== "active") {
        throw badRequest("Cannot add packages to an inactive item");
    }

    // La unidad del package debe ser del mismo tipo que la unidad base del item
    if (packageUnit.unitType !== itemSelected.baseUnit.unitType) {
        throw badRequest("Package unit must be the same type as the item base unit");
    }

    return itemPackageRepository.create({
        ...data,
        baseUnitQuantity,
    });
}

export async function updateItemPackageService(itemPackageId: number, data: UpdateItemPackageDto) {
    await itemPackageRepository.findByIdOrFail(itemPackageId);
    if (data.barcode) {
        await ensureUnique(
            itemPackage,
            and(eq(itemPackage.barcode, data.barcode),sql`${itemPackage.id} != ${itemPackageId}`),
            "Barcode already exists");
    }

    return itemPackageRepository.update(itemPackageId, data);
}

export async function getSuppliersByItemPackageService(query: GetSuppliersByItemPackage) {
    await itemPackageRepository.findByIdOrFail(query.itemPackageId);

    const result = await supplierRepository.getSuppliersByItemPackage(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(
            result.currentPage,
            result.limitPerPage,
            result.total
        ),
    };
}