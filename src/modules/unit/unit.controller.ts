import {
    createUnitSchema,
    getUnitsQuerySchema, UnitParams,
    unitParamsSchema, updateUnitSchema
} from "./unit.dto";
import {
    createUnitService, deleteUnitService,
    getUnitByIdService,
    getUnitsService, updateUnitService
} from "./unit.service";
import {successResponse} from "../../common/http/http.responses";
import { asyncHandler } from "../../common/http/async.handler";

export const getUnitsController = asyncHandler( async (req, res) => {
    const parsedQuery = getUnitsQuerySchema.parse(req.query);

    const result = await getUnitsService(parsedQuery);

    return successResponse(
        res,
        result.data,
        undefined,
        result.meta
    );
});

export const getUnitByIdController = asyncHandler( async (req, res) => {
    const { id }: UnitParams = unitParamsSchema.parse(req.params);

    const result = await getUnitByIdService(id);

    return successResponse(res, result);
});

export const createUnitController = asyncHandler( async (req, res) => {
    const parsedBody = createUnitSchema.parse(req.body);

    const created = await createUnitService(parsedBody);

    return successResponse(
        res,
        created,
        "Unit created successfully",
        undefined,
        201
    );
});

export const updateUnitController = asyncHandler( async (req, res) => {
    const { id }: UnitParams = unitParamsSchema.parse(req.params);

    const data = updateUnitSchema.parse(req.body);

    const updated = await updateUnitService(id, data);

    return successResponse(
        res,
        updated,
        "Unit updated successfully"
    );
});

export const deleteUnitController = asyncHandler(async (req, res) => {
    const { id }: UnitParams = unitParamsSchema.parse(req.params);
    await deleteUnitService(id);
    return res.status(204).send();
});
