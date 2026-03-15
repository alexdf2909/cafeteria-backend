import { asyncHandler } from "../../common/http/async.handler";
import { successResponse } from "../../common/http/http.responses";
import {
    createPurchaseSchema,
    getPurchasesQuerySchema,
    purchaseParamsSchema,
    PurchaseParams,
} from "./purchase.dto";
import {
    createPurchaseService,
    getPurchaseByIdService,
    getPurchasesService,
} from "./purchase.service";

export const getPurchasesController = asyncHandler(async (req, res) => {
    const parsedQuery = getPurchasesQuerySchema.parse(req.query);
    const result = await getPurchasesService(parsedQuery);
    return successResponse(res, result.data, undefined, result.meta);
});

export const getPurchaseByIdController = asyncHandler(async (req, res) => {
    const { id }: PurchaseParams = purchaseParamsSchema.parse(req.params);
    const result = await getPurchaseByIdService(id);
    return successResponse(res, result);
});

export const createPurchaseController = asyncHandler(async (req, res) => {
    const parsedBody = createPurchaseSchema.parse(req.body);
    const created = await createPurchaseService(parsedBody, req.user!.id);
    return successResponse(res, created, "Purchase registered successfully", undefined, 201);
});