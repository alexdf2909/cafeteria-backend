import { asyncHandler } from "../../common/http/async.handler";
import { successResponse } from "../../common/http/http.responses";
import {
    createProductSchema,
    createPresentationSchema,
    getProductsQuerySchema,
    productParamsSchema,
    presentationParamsSchema,
    ProductParams,
    PresentationParams,
    updateProductSchema,
    updatePresentationSchema,
} from "./product.dto";
import {
    createProductService,
    createPresentationService,
    getProductByIdService,
    getProductsService,
    updateProductService,
    updatePresentationService,
} from "./product.service";

// ─── Product ─────────────────────────────────────────────────────────────────

export const getProductsController = asyncHandler(async (req, res) => {
    const parsedQuery = getProductsQuerySchema.parse(req.query);
    const result = await getProductsService(parsedQuery);
    return successResponse(res, result.data, undefined, result.meta);
});

export const getProductByIdController = asyncHandler(async (req, res) => {
    const { id }: ProductParams = productParamsSchema.parse(req.params);
    const result = await getProductByIdService(id);
    return successResponse(res, result);
});

export const createProductController = asyncHandler(async (req, res) => {
    const parsedBody = createProductSchema.parse(req.body);
    const created = await createProductService(parsedBody);
    return successResponse(res, created, "Product created successfully", undefined, 201);
});

export const updateProductController = asyncHandler(async (req, res) => {
    const { id }: ProductParams = productParamsSchema.parse(req.params);
    const data = updateProductSchema.parse(req.body);
    const updated = await updateProductService(id, data);
    return successResponse(res, updated, "Product updated successfully");
});

// ─── Product Presentation ────────────────────────────────────────────────────

export const createPresentationController = asyncHandler(async (req, res) => {
    const { id }: ProductParams = productParamsSchema.parse(req.params);
    const data = createPresentationSchema.parse(req.body);
    const created = await createPresentationService(id, data);
    return successResponse(res, created, "Presentation created successfully", undefined, 201);
});

export const updatePresentationController = asyncHandler(async (req, res) => {
    const { id }: PresentationParams = presentationParamsSchema.parse(req.params);
    const data = updatePresentationSchema.parse(req.body);
    const updated = await updatePresentationService(id, data);
    return successResponse(res, updated, "Presentation updated successfully");
});