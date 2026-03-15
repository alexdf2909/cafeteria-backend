import { Response } from "express";
import { ApiSuccess, ApiError } from "./http.types";

export function successResponse<T>(
    res: Response,
    data: T,
    message?: string,
    meta?: unknown,
    statusCode = 200
): Response<ApiSuccess<T>> {

    const response: ApiSuccess<T> = {
        success: true,
        data,
    };

    if (message) {
        response.message = message;
    }

    if (meta) {
        response.meta = meta;
    }

    return res.status(statusCode).json(response);
}

export function errorResponse(
    res: Response,
    statusCode: number,
    error: {
        type?: string;
        message: string;
        details?: unknown;
        fields?: unknown;
    }
): Response<ApiError> {

    const response: ApiError = {
        success: false,
        error: {
            type: error.type ?? "error",
            message: error.message,
            details: error.details,
            fields: error.fields,
        },
    };

    return res.status(statusCode).json(response);
}