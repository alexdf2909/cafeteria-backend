import {
    getItemsQuerySchema,
    createItemSchema, ItemParams, itemParamsSchema, updateItemSchema,
} from "./item.dto";
import {
    getItemsService,
    createItemService, getItemByIdService, updateItemService, getItemStockService, getItemPackagesByItemService,
} from "./item.service";
import {asyncHandler} from "../../common/http/async.handler";
import {successResponse} from "../../common/http/http.responses";
import {getItemPackagesByItemQuerySchema} from "../itemPackage/itemPackage.dto";

export const getItemsController = asyncHandler( async (req, res) => {
    const parsedQuery = getItemsQuerySchema.parse(req.query);

    const result = await getItemsService(parsedQuery);

    return successResponse(
        res,
        result.data,
        undefined,
        result.meta,
    );
});

export const getItemByIdController = asyncHandler( async (req, res) => {
    const { id }: ItemParams = itemParamsSchema.parse(req.params);

    const result = await getItemByIdService(id);

    return successResponse(res, result);
});

export const createItemController = asyncHandler( async (req, res) => {
    const parsedBody = createItemSchema.parse(req.body);

    const created = await createItemService(parsedBody);

    return successResponse(
        res,
        created,
        "Item created successfully",
        undefined,
        201
    );
});

export const updateItemController = asyncHandler( async (req, res) => {
    const { id }: ItemParams = itemParamsSchema.parse(req.params);

    const data = updateItemSchema.parse(req.body);

    const updated = await updateItemService(id, data);

    return successResponse(res, updated, "Item updated successfully");
});

export const getItemStockController = asyncHandler( async (req, res) => {
    const { id }: ItemParams = itemParamsSchema.parse(req.params);

    const result = await getItemStockService(id);

    return successResponse(res, result);
});

export const getItemPackagesByItemController = asyncHandler(async (req, res) => {
    const { id } = itemParamsSchema.parse(req.params);

    const query = getItemPackagesByItemQuerySchema.parse({
        ...req.query,
        itemId: id, // ← inyecta el id del param
    });

    const result = await getItemPackagesByItemService(query);

    return successResponse(res, result.data, undefined, result.meta);
});