import { asyncHandler } from "../../common/http/async.handler";
import { successResponse } from "../../common/http/http.responses";
import {
    createSaleSchema,
    getSalesQuerySchema,
    saleParamsSchema,
    SaleParams,
} from "./sale.dto";
import {
    createSaleService,
    getSaleByIdService,
    getSalesService,
} from "./sale.service";

export const getSalesController = asyncHandler(async (req, res) => {
    const parsedQuery = getSalesQuerySchema.parse(req.query);
    const result = await getSalesService(parsedQuery);
    return successResponse(res, result.data, undefined, result.meta);
});

export const getSaleByIdController = asyncHandler(async (req, res) => {
    const { id }: SaleParams = saleParamsSchema.parse(req.params);
    const result = await getSaleByIdService(id);
    return successResponse(res, result);
});

export const createSaleController = asyncHandler(async (req, res) => {
    const parsedBody = createSaleSchema.parse(req.body);
    const created = await createSaleService(parsedBody, req.user!.id);
    return successResponse(res, created, "Sale registered successfully", undefined, 201);
});