import { BaseRepository } from "../../common/db/base.repository";
import {item, itemCategory, NewItemCategory, unit} from "../../db/schema";
import { GetItemCategoriesQuery, UpdateItemCategoryDto } from "./itemCategory.dto";
import { buildPagination } from "../../common/http/pagination.helpers";
import { buildWhereClause, countRows } from "../../common/db/db.helpers";
import {desc, eq, getTableColumns, ilike, or} from "drizzle-orm";
import { db } from "../../db";

export class ItemCategoryRepository extends BaseRepository<
    typeof itemCategory, NewItemCategory, UpdateItemCategoryDto, number>{
    constructor() {
        super(itemCategory, itemCategory.id, "ItemCategory");
    }

    async getItemCategories(query: GetItemCategoriesQuery) {
        const { search, page, limit } = query;

        const { currentPage, limitPerPage, offset } =
            buildPagination(page, limit);

        const whereClause = buildWhereClause([
            search
                ? or(
                    ilike(itemCategory.name,`%${search}%`),
                )
                : undefined,
        ]);

        const total = await countRows(itemCategory, whereClause);

        const data = await db
            .select(getTableColumns(itemCategory))
            .from(itemCategory)
            .where(whereClause)
            .orderBy(desc(itemCategory.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        return {
            data,
            total,
            currentPage,
            limitPerPage,
        };
    }

    async countItems(itemCategoryId: number) {
        return countRows(item, eq(item.categoryId, itemCategoryId));
    }
}

export const itemCategoryRepository  = new ItemCategoryRepository();