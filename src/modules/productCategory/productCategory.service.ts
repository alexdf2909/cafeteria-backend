import {
    and,
    eq,
    sql
} from "drizzle-orm";
import {
    product,
    productCategory,
} from "../../db/schema";

import {
    CreateProductCategoryDto,
    GetProductCategoriesQuery,
    UpdateProductCategoryDto
} from "./productCategory.dto";

import {
    buildPaginationMeta
} from "../../common/http/pagination.helpers";

import {
    ensureNotInUse,
    ensureUnique,
} from "../../common/db/db.helpers";
import {productCategoryRepository} from "./productCategory.repository";
import {productRepository} from "../product/product.repository";
import {GetProductsByCategoryQuery} from "../product/product.dto";

export async function getProductCategoriesService(
    query: GetProductCategoriesQuery
) {
    const result = await productCategoryRepository.getProductCategories(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(
            result.currentPage,
            result.limitPerPage,
            result.total
        ),
    };
}

export async function getProductCategoryByIdService(
    categoryId: number
) {
    const productCategorySelected = await productCategoryRepository.findByIdOrFail(categoryId);

    const productsCount = await productCategoryRepository.countProducts(categoryId);

    return {
        ...productCategorySelected,
        totals: {
            products: productsCount,
        },
    };
}

export async function createProductCategoryService(
    data: CreateProductCategoryDto
) {

    await ensureUnique(
        productCategory,
        eq(productCategory.name, data.name),
        "Product category name already exists"
    );

    return productCategoryRepository.create(data);
}


export async function updateProductCategoryService(
    categoryId: number,
    data: UpdateProductCategoryDto
) {
    await productCategoryRepository.findByIdOrFail(categoryId);

    if (data.name) {
        await ensureUnique(
            productCategory,
            and(
                eq(productCategory.name, data.name),
                sql`${productCategory.id} != ${categoryId}`
            ),
            "Product category name already exists"
        );
    }

    return productCategoryRepository.update(categoryId, data);
}


export async function deleteProductCategoryService(
    categoryId: number
) {
    await productCategoryRepository.findByIdOrFail(categoryId);

    await ensureNotInUse(
        product,
        eq(product.categoryId, categoryId),
        "Product category cannot be deleted because it is in use"
    );

    await productCategoryRepository.delete(categoryId);
    return { message: "Unit deleted successfully" };
}

// LISTA DE productos por categoria
export async function getProductsByCategoryService(query: GetProductsByCategoryQuery) {
    await productCategoryRepository.findByIdOrFail(query.categoryId);

    const result = await productRepository.getProductsByCategory(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(
            result.currentPage,
            result.limitPerPage,
            result.total
        ),
    };
}