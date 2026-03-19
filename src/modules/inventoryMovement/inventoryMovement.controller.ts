import { asyncHandler } from "../../common/http/async.handler";
import { successResponse } from "../../common/http/http.responses";
import {
    transferSchema,
    adjustmentSchema,
    damageSchema,
    expirationSchema,
    getMovementsQuerySchema,
    movementParamsSchema,
    MovementParams, expirationManualSchema,
} from "./inventoryMovement.dto";
import {
    getMovementsService,
    getStockByItemService,
    getExpiredAlertsService,
    transferStockService,
    adjustStockService,
    damageStockService,
    resolveExpirationService, manualExpirationService,
} from "./inventoryMovement.service";
import {inventoryMovementRepository} from "./inventoryMovement.repository";

export const getMovementsController = asyncHandler(async (req, res) => {
    const parsedQuery = getMovementsQuerySchema.parse(req.query);
    const result = await getMovementsService(parsedQuery);
    return successResponse(res, result.data, undefined, result.meta);
});

export const getStockByItemController = asyncHandler(async (req, res) => {
    const { id }: MovementParams = movementParamsSchema.parse(req.params);
    const result = await getStockByItemService(id);
    return successResponse(res, result);
});

export const getExpiredAlertsController = asyncHandler(async (req, res) => {
    const result = await getExpiredAlertsService();
    return successResponse(res, result);
});

export const transferStockController = asyncHandler(async (req, res) => {
    const data = transferSchema.parse(req.body);
    await transferStockService(data, req.user!.id);
    return successResponse(res, null, "Transfer completed successfully");
});

export const adjustStockController = asyncHandler(async (req, res) => {
    const data = adjustmentSchema.parse(req.body);
    await adjustStockService(data, req.user!.id);
    return successResponse(res, null, "Adjustment completed successfully");
});

export const damageStockController = asyncHandler(async (req, res) => {
    const data = damageSchema.parse(req.body);
    await damageStockService(data, req.user!.id);
    return successResponse(res, null, "Damage registered successfully");
});

export const resolveExpirationController = asyncHandler(async (req, res) => {
    const data = expirationSchema.parse(req.body);
    await resolveExpirationService(data, req.user!.id);
    return successResponse(res, null, "Expiration resolved successfully");
});

export const manualExpirationController = asyncHandler(async (req, res) => {
    const data = expirationManualSchema.parse(req.body);
    await manualExpirationService(data, req.user!.id);
    return successResponse(res, null, "Expiration registered successfully");
});

export const getLotsByItemController = asyncHandler(async (req, res) => {
    const { id } = movementParamsSchema.parse(req.params);
    const location = req.query.location as "warehouse" | "sales_module" ?? "warehouse";
    const result = await inventoryMovementRepository.getAvailableLotsFEFO(id, location);
    return successResponse(res, result);
});