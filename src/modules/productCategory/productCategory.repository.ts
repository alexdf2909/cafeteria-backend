import { BaseRepository } from "../../common/db/base.repository";
import {product, productCategory, NewProductCategory, unit} from "../../db/schema";
import { GetProductCategoriesQuery, UpdateProductCategoryDto } from "./productCategory.dto";
import { buildPagination } from "../../common/http/pagination.helpers";
import { buildWhereClause, countRows } from "../../common/db/db.helpers";
import {desc, eq, getTableColumns, ilike, or} from "drizzle-orm";
import { db } from "../../db";

export class ProductCategoryRepository extends BaseRepository<
    typeof productCategory, NewProductCategory, UpdateProductCategoryDto, number>{
    constructor() {
        super(productCategory, productCategory.id, "ProductCategory");
    }

    async getProductCategories(query: GetProductCategoriesQuery) {
        const { search, page, limit } = query;

        const { currentPage, limitPerPage, offset } =
            buildPagination(page, limit);

        const whereClause = buildWhereClause([
            search
                ? or(
                    ilike(productCategory.name,`%${search}%`),
                )
                : undefined,
        ]);

        const total = await countRows(productCategory, whereClause);

        const data = await db
            .select(getTableColumns(productCategory))
            .from(productCategory)
            .where(whereClause)
            .orderBy(desc(productCategory.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        return {
            data,
            total,
            currentPage,
            limitPerPage,
        };
    }

    async countProducts(productCategoryId: number) {
        return countRows(product, eq(product.categoryId, productCategoryId));
    }
}

export const productCategoryRepository  = new ProductCategoryRepository();