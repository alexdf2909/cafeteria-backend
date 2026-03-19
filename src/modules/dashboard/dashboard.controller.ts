import { asyncHandler } from "../../common/http/async.handler";
import { successResponse } from "../../common/http/http.responses";
import { getDashboardQuerySchema } from "./dashboard.dto";
import {getDashboardService, getIndicatorsByItemService} from "./dashboard.service";

export const getIndicatorsByItemController = asyncHandler(async (req, res) => {
    const result = await getIndicatorsByItemService();
    return successResponse(res, result);
});

export const getDashboardController = asyncHandler(async (req, res) => {
    const query = getDashboardQuerySchema.parse(req.query);
    const result = await getDashboardService(query);
    return successResponse(res, result);
});