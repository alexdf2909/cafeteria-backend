import { BaseRepository } from "../../common/db/base.repository";
import { unit, item, NewUnit } from "../../db/schema";
import {UpdateUnitDto, GetUnitsQuery} from "./unit.dto";
import { db } from "../../db";

import {
    desc,
    eq,
    getTableColumns,
    ilike,
    or,
} from "drizzle-orm";

import {
    buildPagination,
} from "../../common/http/pagination.helpers";

import {
    buildWhereClause,
    countRows,
} from "../../common/db/db.helpers";

export class UnitRepository extends BaseRepository<
    typeof unit,
    NewUnit,
    UpdateUnitDto,
    number
> {
    constructor() {
        super(unit, unit.id, "Unit");
    }

    async getUnits(query: GetUnitsQuery) {
        const { search, unitType, page, limit } = query;

        const { currentPage, limitPerPage, offset } =
            buildPagination(page, limit);

        const whereClause = buildWhereClause([
            search
                ? or(
                    ilike(unit.name, `%${search}%`),
                    ilike(unit.symbol, `%${search}%`)
                )
                : undefined,
            unitType ? eq(unit.unitType, unitType) : undefined,
        ]);

        const total = await countRows(unit, whereClause);

        const data = await db
            .select(getTableColumns(unit))
            .from(unit)
            .where(whereClause)
            .orderBy(desc(unit.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        return {
            data,
            total,
            currentPage,
            limitPerPage,
        };
    }

    async countItems(unitId: number) {
        return countRows(
            item,
            eq(item.baseUnitId, unitId)
        );
    }
}

export const unitRepository = new UnitRepository();