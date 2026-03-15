import { asyncHandler } from "../../common/http/async.handler";
import { successResponse } from "../../common/http/http.responses";
import { getDashboardQuerySchema } from "./dashboard.dto";
import { getDashboardService } from "./dashboard.service";

export const getDashboardController = asyncHandler(async (req, res) => {
    const parsedQuery = getDashboardQuerySchema.parse(req.query);
    const result = await getDashboardService(parsedQuery);
    return successResponse(res, result);
});