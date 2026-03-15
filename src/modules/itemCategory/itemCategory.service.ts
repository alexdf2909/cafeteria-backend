import {
    and,
    eq,
    sql
} from "drizzle-orm";
import {
    item,
    itemCategory,
} from "../../db/schema";

import {
    CreateItemCategoryDto,
    GetItemCategoriesQuery,
    UpdateItemCategoryDto
} from "./itemCategory.dto";

import {
    buildPaginationMeta
} from "../../common/http/pagination.helpers";

import {
    ensureNotInUse,
    ensureUnique,
} from "../../common/db/db.helpers";
import {itemCategoryRepository} from "./itemCategory.repository";
import {itemRepository} from "../item/item.repository";
import {GetItemsByCategoryQuery} from "../item/item.dto";

export async function getItemCategoriesService(
    query: GetItemCategoriesQuery
) {
    const result = await itemCategoryRepository.getItemCategories(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(
            result.currentPage,
            result.limitPerPage,
            result.total
        ),
    };
}

export async function getItemCategoryByIdService(
    categoryId: number
) {
    const itemCategorySelected = await itemCategoryRepository.findByIdOrFail(categoryId);

    const itemsCount = await itemCategoryRepository.countItems(categoryId);

    return {
        ...itemCategorySelected,
        totals: {
          items: itemsCount,
        },
    };
}

export async function createItemCategoryService(
    data: CreateItemCategoryDto
) {

    await ensureUnique(
        itemCategory,
        eq(itemCategory.name, data.name),
        "Item category name already exists"
    );

    return itemCategoryRepository.create(data);
}


export async function updateItemCategoryService(
    categoryId: number,
    data: UpdateItemCategoryDto
) {
    await itemCategoryRepository.findByIdOrFail(categoryId);

    if (data.name) {
        await ensureUnique(
            itemCategory,
            and(
                eq(itemCategory.name, data.name),
                sql`${itemCategory.id} != ${categoryId}`
            ),
            "Item category name already exists"
        );
    }

    return itemCategoryRepository.update(categoryId, data);
}


export async function deleteItemCategoryService(
    categoryId: number
) {
    await itemCategoryRepository.findByIdOrFail(categoryId);

    await ensureNotInUse(
        item,
        eq(item.categoryId, categoryId),
        "Item category cannot be deleted because it is in use"
    );

    await itemCategoryRepository.delete(categoryId);
    return { message: "Unit deleted successfully" };
}

// LISTA DE ITEMS por categoria
export async function getItemsByCategoryService(query: GetItemsByCategoryQuery) {
  await itemCategoryRepository.findByIdOrFail(query.categoryId);

  const result = await itemRepository.getItemsByCategory(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(
            result.currentPage,
            result.limitPerPage,
            result.total
        ),
    };
}