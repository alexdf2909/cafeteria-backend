import {
    createProductCategorySchema,
    getProductCategoriesQuerySchema,
    ProductCategoryParams,
    productCategoryParamsSchema, updateProductCategorySchema
} from "./productCategory.dto";
import {
    createProductCategoryService, deleteProductCategoryService,
    getProductCategoriesService,
    getProductCategoryByIdService, getProductsByCategoryService,
    updateProductCategoryService
} from "./productCategory.service";
import {asyncHandler} from "../../common/http/async.handler";
import {successResponse} from "../../common/http/http.responses";
import {getProductsByCategoryQuerySchema} from "../product/product.dto";



export const getProductCategoriesController = asyncHandler( async (req, res) => {
    const parsedQuery = getProductCategoriesQuerySchema.parse(req.query);

    const result = await getProductCategoriesService(parsedQuery);

    return successResponse(
        res,
        result.data,
        undefined,
        result.meta
    );
});

export const createProductCategoryController = asyncHandler( async (req, res) => {
    const parsedBody = createProductCategorySchema.parse(req.body);

    const created = await createProductCategoryService(parsedBody);

    return successResponse(
        res,
        created,
        "Product Category created successfully",
        undefined,
        201
    );
});

export const getProductCategoryByIdController = asyncHandler( async (req, res) => {
    const { id }: ProductCategoryParams = productCategoryParamsSchema.parse(req.params);

    const result = await getProductCategoryByIdService(id);

    return successResponse(res, result);
});

export const updateProductCategoryController = asyncHandler( async (req, res) => {
    const { id }: ProductCategoryParams = productCategoryParamsSchema.parse(req.params);

    const data = updateProductCategorySchema.parse(req.body);

    const updated = await updateProductCategoryService(id, data);

    return successResponse(
        res,
        updated,
        "Product Category updated successfully"
    );
});

export const deleteProductCategoryController = asyncHandler(async (req, res) => {
    const { id }: ProductCategoryParams = productCategoryParamsSchema.parse(req.params);
    await deleteProductCategoryService(id);
    return res.status(204).send();
});

export const getProductsByCategoryController = asyncHandler( async (req, res) => {
    const parsedQuery = getProductsByCategoryQuerySchema.parse(req.query);
    const result = await getProductsByCategoryService(parsedQuery);
    return successResponse(
        res,
        result,
        undefined,
        result.meta,
    )
});