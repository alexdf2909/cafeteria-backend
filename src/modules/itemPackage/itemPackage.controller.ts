import {asyncHandler} from "../../common/http/async.handler";
import {
    createItemPackageSchema,
    ItemPackageParams,
    itemPackageParamsSchema,
    updateItemPackageSchema
} from "./itemPackage.dto";
import {
    createItemPackageService,
    getItemPackageByIdService,
    getSuppliersByItemPackageService,
    updateItemPackageService
} from "./itemPackage.service";
import {successResponse} from "../../common/http/http.responses";
import {getSuppliersByItemPackageQuerySchema} from "../supplier/supplier.dto";

export const getItemPackageByIdController = asyncHandler(async (req, res) => {
    const { id }: ItemPackageParams = itemPackageParamsSchema.parse(req.params);

    const result = await getItemPackageByIdService(id);

    return successResponse(res, result);
});

export const createItemPackageController = asyncHandler(async (req, res) => {
    const parsedBody = createItemPackageSchema.parse(req.body);

    const created = await createItemPackageService(parsedBody);

    return successResponse(
        res,
        created,
        "Item Package created successfully",
        undefined,
        201
    );
})

export const updateItemPackageController = asyncHandler(async (req, res) => {
    const { id }: ItemPackageParams = itemPackageParamsSchema.parse(req.params);

    const data = updateItemPackageSchema.parse(req.body);

    const updated = await updateItemPackageService(id, data);

    return successResponse(res, updated, "Item Package updated successfully");
});

export const getSuppliersByItemPackageController = asyncHandler(async (req, res) => {
    const parsedQuery = getSuppliersByItemPackageQuerySchema.parse(req.query);

    const result = await getSuppliersByItemPackageService(parsedQuery);

    return successResponse(
        res,
        result.data,
        undefined,
        result.meta,
    );
})