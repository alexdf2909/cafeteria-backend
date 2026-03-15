import {
    createItemCategorySchema,
    getItemCategoriesQuerySchema,
    ItemCategoryParams,
    itemCategoryParamsSchema, updateItemCategorySchema
} from "./itemCategory.dto";
import {
    createItemCategoryService, deleteItemCategoryService,
    getItemCategoriesService,
    getItemCategoryByIdService, getItemsByCategoryService,
    updateItemCategoryService
} from "./itemCategory.service";
import {asyncHandler} from "../../common/http/async.handler";
import {successResponse} from "../../common/http/http.responses";
import {getItemsByCategoryQuerySchema} from "../item/item.dto";



export const getItemCategoriesController = asyncHandler( async (req, res) => {
    const parsedQuery = getItemCategoriesQuerySchema.parse(req.query);

    const result = await getItemCategoriesService(parsedQuery);

    return successResponse(
        res,
        result.data,
        undefined,
        result.meta
    );
});

export const createItemCategoryController = asyncHandler( async (req, res) => {
    const parsedBody = createItemCategorySchema.parse(req.body);

    const created = await createItemCategoryService(parsedBody);

    return successResponse(
        res,
        created,
        "Item Category created successfully",
        undefined,
        201
    );
});

export const getItemCategoryByIdController = asyncHandler( async (req, res) => {
    const { id }: ItemCategoryParams = itemCategoryParamsSchema.parse(req.params);

    const result = await getItemCategoryByIdService(id);

    return successResponse(res, result);
});

export const updateItemCategoryController = asyncHandler( async (req, res) => {
    const { id }: ItemCategoryParams = itemCategoryParamsSchema.parse(req.params);

    const data = updateItemCategorySchema.parse(req.body);

    const updated = await updateItemCategoryService(id, data);

    return successResponse(
        res,
        updated,
        "Item Category updated successfully"
    );
});

export const deleteItemCategoryController = asyncHandler(async (req, res) => {
    const { id }: ItemCategoryParams = itemCategoryParamsSchema.parse(req.params);
    await deleteItemCategoryService(id);
    return res.status(204).send();
});

export const getItemsByCategoryController = asyncHandler( async (req, res) => {
    const parsedQuery = getItemsByCategoryQuerySchema.parse(req.query);
    const result = await getItemsByCategoryService(parsedQuery);
    return successResponse(
        res,
        result,
        undefined,
        result.meta,
    )
});