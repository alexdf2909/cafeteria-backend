import { db } from "../../db";
import {
    item,
    unit,
    itemCategory,
    inventoryLot,
    lotBalance,
    NewItem, itemPackage,
} from "../../db/schema";
import {
    and,
    or,
    eq,
    ilike,
    desc,
    sql,
    isNotNull,
    lte,
    getTableColumns, gt,
} from "drizzle-orm";
import {CreateItemDto, GetItemsQuery, UpdateItemDto} from "./item.dto";
import {itemRepository} from "./item.repository";
import {buildPaginationMeta} from "../../common/http/pagination.helpers";
import {ensureUnique} from "../../common/db/db.helpers";
import {itemCategoryRepository} from "../itemCategory/itemCategory.repository";
import {unitRepository} from "../unit/unit.repository";
import {badRequest} from "../../errors/error.helpers";
import {itemPackageRepository} from "../itemPackage/itemPackage.repository";
import {GetItemPackagesByItemQuery} from "../itemPackage/itemPackage.dto";

export async function getItemsService(query: GetItemsQuery) {
    const result = await itemRepository.getItems(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(
            result.currentPage,
            result.limitPerPage,
            result.total
        ),
    };
}

export async function getItemPackagesByItemService(query: GetItemPackagesByItemQuery) {
    await itemRepository.findByIdOrFail(query.itemId);

    const result = await itemPackageRepository.getItemPackagesByItem(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(
            result.currentPage,
            result.limitPerPage,
            result.total
        ),
    };
}

export async function getItemByIdService(itemId: number) {
    await itemRepository.findByIdOrFail(itemId);

    const itemSelected = await itemRepository.findByIdWithDetails(itemId);

    const itemPackagesCount = await itemRepository.countItemPackages(itemId);

    return {
        ...itemSelected,
        totals: {
            itemPackages: itemPackagesCount,
        },
    };
}

export async function createItemService(data: CreateItemDto) {
    await ensureUnique(item, eq(item.sku, data.sku), "SKU already exists");

    await itemCategoryRepository.findByIdOrFail(data.categoryId);
    await unitRepository.findByIdOrFail(data.baseUnitId);

    if (data.isPerishable && !data.shelfLifeDays) {
        throw badRequest("Perishable items must have a shelf life");
    }

    if (!data.isPerishable && data.shelfLifeDays) {
        throw badRequest("Non-perishable items cannot have a shelf life");
    }

    if (data.maxStock > 0 && data.reorderPoint > data.maxStock) {
        throw badRequest("Reorder point cannot exceed max stock");
    }

    if (data.reorderPoint > 0 && data.minStock > data.reorderPoint) {
        throw badRequest("Min stock cannot exceed reorder point");
    }

    return itemRepository.create(data);
}

export async function updateItemService(itemId: number, data: UpdateItemDto) {
    const current = await itemRepository.findByIdOrFail(itemId);

    // Verificar referencia si cambia categoría
    if (data.categoryId) {
        await itemCategoryRepository.findByIdOrFail(data.categoryId);
    }

    // Para las validaciones de stock, mezclas los valores nuevos con los actuales
    const minStock = data.minStock ?? current.minStock;
    const reorderPoint = data.reorderPoint ?? current.reorderPoint;
    const maxStock = data.maxStock ?? current.maxStock;

    if (maxStock > 0 && reorderPoint > maxStock) {
        throw badRequest("Reorder point cannot exceed max stock");
    }

    if (reorderPoint > 0 && minStock > reorderPoint) {
        throw badRequest("Min stock cannot exceed reorder point");
    }

    if (data.shelfLifeDays && !current.isPerishable) {
        throw badRequest("Cannot set shelf life on non-perishable item");
    }

    return itemRepository.update(itemId, data);
}

export async function getItemStockService(itemId: number) {
    await itemRepository.findByIdOrFail(itemId);
    return await itemRepository.getItemStock(itemId);
}
