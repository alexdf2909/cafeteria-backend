import { asyncHandler } from "../../common/http/async.handler";
import { successResponse } from "../../common/http/http.responses";
import {
    createItemSupplierSchema,
    updateItemSupplierSchema,
    itemSupplierParamsSchema,
    ItemSupplierParams,
} from "./itemSupplier.dto";
import {
    createItemSupplierService,
    updateItemSupplierService,
} from "./itemSupplier.service";

export const createItemSupplierController = asyncHandler(async (req, res) => {
    const parsedBody = createItemSupplierSchema.parse(req.body);

    const created = await createItemSupplierService(parsedBody);

    return successResponse(
        res,
        created,
        "Item supplier created successfully",
        undefined,
        201
    );
});

export const updateItemSupplierController = asyncHandler(async (req, res) => {
    const { id }: ItemSupplierParams = itemSupplierParamsSchema.parse(req.params);

    const data = updateItemSupplierSchema.parse(req.body);

    const updated = await updateItemSupplierService(id, data);

    return successResponse(res, updated, "Item supplier updated successfully");
});