import {
    createUserSchema,
    getUsersQuerySchema,
    updateUserSchema, UserParams,
    userParamsSchema
} from "./user.dto";

import {
    createUserService,
    getUserByIdService,
    getUsersService,
    updateUserService
} from "./user.service";

import { successResponse } from "../../common/http/http.responses";
import { badRequest } from "../../errors/error.helpers";
import {asyncHandler} from "../../common/http/async.handler";

export const getUsersController = asyncHandler( async (req, res) => {
    const parsedQuery = getUsersQuerySchema.parse(req.query);

    const result = await getUsersService(parsedQuery);

    return successResponse(
        res,
        result.data,
        undefined,
        result.meta
    );
});

export const getUserByIdController = asyncHandler(async (req, res) => {
    const { id }: UserParams = userParamsSchema.parse(req.params);
    const result = await getUserByIdService(id, req.user!.id, req.user!.role);
    return successResponse(res, result);
});

export const createUserController = asyncHandler( async (req, res) => {
    const parsedBody = createUserSchema.parse(req.body);

    const created = await createUserService(parsedBody);

    return successResponse(
        res,
        created,
        "User created successfully",
        undefined,
        201
    );
});

export const updateUserController = asyncHandler(async (req, res) => {
    const { id }: UserParams = userParamsSchema.parse(req.params);
    const data = updateUserSchema.parse(req.body);
    const updated = await updateUserService(id, data, req.user!.id, req.user!.role);
    return successResponse(res, updated, "User updated successfully");
});