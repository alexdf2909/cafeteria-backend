import {asyncHandler} from "../../common/http/async.handler";
import {
    createSupplierSchema,
    getSuppliersQuerySchema,
    SupplierParams,
    supplierParamsSchema,
    updateSupplierSchema
} from "./supplier.dto";
import {
    createSupplierService, getItemPackagesBySupplierService,
    getSupplierByIdService,
    getSuppliersService,
    updateSupplierService
} from "./supplier.service";
import {successResponse} from "../../common/http/http.responses";
import {getItemPackagesBySupplierQuerySchema} from "../itemPackage/itemPackage.dto";

export const getSuppliersController = asyncHandler(async (req, res) => {
    const parsedQuery = getSuppliersQuerySchema.parse(req.query);

    const result = await getSuppliersService(parsedQuery);

    return successResponse(
        res,
        result.data,
        undefined,
        result.meta,
    );
});

export const getSupplierByIdController = asyncHandler(async (req, res) => {
    const { id }: SupplierParams = supplierParamsSchema.parse(req.params);

    const result = await getSupplierByIdService(id);

    return successResponse(res, result);
});

export const createSupplierController = asyncHandler(async (req, res) => {
    const parsedBody = createSupplierSchema.parse(req.body);

    const created = await createSupplierService(parsedBody);

    return successResponse(
        res,
        created,
        "Supplier created successfully",
        undefined,
        201
    );
});

export const updateSupplierController = asyncHandler(async (req, res) => {
    const { id }: SupplierParams = supplierParamsSchema.parse(req.params);

    const data = updateSupplierSchema.parse(req.body);

    const updated = await updateSupplierService(id, data);

    return successResponse(res, updated, "Supplier updated successfully");
});

export const getItemPackagesBySupplierController = asyncHandler(async (req, res) => {
    const { id } = supplierParamsSchema.parse(req.params);

    const query = getItemPackagesBySupplierQuerySchema.parse({
        ...req.query,
        supplierId: id, // ← inyecta el id del param
    });

    const result = await getItemPackagesBySupplierService(query);
    return successResponse(res, result.data, undefined, result.meta);
});