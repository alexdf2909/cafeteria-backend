import { asyncHandler } from "../../common/http/async.handler";
import { successResponse } from "../../common/http/http.responses";
import {
    createInventoryCountSchema,
    getInventoryCountsQuerySchema,
    inventoryCountParamsSchema,
    InventoryCountParams,
} from "./inventoryCount.dto";
import {
    createInventoryCountService,
    getInventoryCountByIdService,
    getInventoryCountsService,
} from "./inventoryCount.service";

export const getInventoryCountsController = asyncHandler(async (req, res) => {
    const parsedQuery = getInventoryCountsQuerySchema.parse(req.query);
    const result = await getInventoryCountsService(parsedQuery);
    return successResponse(res, result.data, undefined, result.meta);
});

export const getInventoryCountByIdController = asyncHandler(async (req, res) => {
    const { id }: InventoryCountParams = inventoryCountParamsSchema.parse(req.params);
    const result = await getInventoryCountByIdService(id);
    return successResponse(res, result);
});

export const createInventoryCountController = asyncHandler(async (req, res) => {
    const parsedBody = createInventoryCountSchema.parse(req.body);
    const created = await createInventoryCountService(parsedBody, req.user!.id);
    return successResponse(res, created, "Inventory count completed successfully", undefined, 201);
});