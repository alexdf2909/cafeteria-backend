import { CreateUnitDto, GetUnitsQuery, UpdateUnitDto } from "./unit.dto";
import { NewUnit, unit, item } from "../../db/schema";

import {
    exists,
    ensureUnique,
    ensureNotInUse,
    buildWhereClause,
} from "../../common/db/db.helpers";

import { and, eq, sql } from "drizzle-orm";

import { badRequest, conflict } from "../../errors/error.helpers";
import { buildPaginationMeta } from "../../common/http/pagination.helpers";

import { unitRepository } from "./unit.repository";

export async function getUnitsService(query: GetUnitsQuery) {

    const result = await unitRepository.getUnits(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(
            result.currentPage,
            result.limitPerPage,
            result.total
        ),
    };
}

export async function getUnitByIdService(unitId: number) {

    const unitSelected =
        await unitRepository.findByIdOrFail(unitId);

    const itemsCount =
        await unitRepository.countItems(unitId);

    return {
        ...unitSelected,
        totals: {
            items: itemsCount,
        },
    };
}

export async function createUnitService(data: CreateUnitDto) {

    await ensureUnique(
        unit,
        eq(unit.symbol, data.symbol),
        "Unit symbol already exists"
    );

    await ensureUnique(
        unit,
        buildWhereClause([
            eq(unit.name, data.name),
            eq(unit.unitType, data.unitType),
        ]),
        "Unit name already exists for this type"
    );

    if (data.isBase && data.toBaseFactor !== 1) {
        throw badRequest("Base unit must have toBaseFactor = 1");
    }

    if (data.isBase) {
        if (
            await exists(
                unit,
                and(
                    eq(unit.unitType, data.unitType),
                    eq(unit.isBase, true)
                )
            )
        ) {
            throw conflict("Base unit already exists for this type");
        }
    }

    return unitRepository.create(data);
}

export async function updateUnitService(unitId: number, data: UpdateUnitDto) {
    await unitRepository.findByIdOrFail(unitId);

    if (data.symbol) {
        await ensureUnique(
            unit,
            and(eq(unit.symbol, data.symbol), sql`${unit.id} != ${unitId}`),
            "Unit symbol already exists"
        );
    }

    return unitRepository.update(unitId, data);
}

export async function deleteUnitService(unitId: number) {
    await unitRepository.findByIdOrFail(unitId);

    await ensureNotInUse(
        item,
        eq(item.baseUnitId, unitId),
        "Unit cannot be deleted because it is already in use"
    );

    await unitRepository.delete(unitId);
    return { message: "Unit deleted successfully" };
}

