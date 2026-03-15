import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "./AppError";
import { errorResponse } from "../common/http/http.responses";

export function errorHandler(
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) {

    // Zod validation errors
    if (error instanceof ZodError) {
        return errorResponse(res, 400, {
            type: "validation_error",
            message: "Validation failed",
            fields: error.flatten().fieldErrors,
        });
    }

    // Custom application errors
    if (error instanceof AppError) {
        return errorResponse(res, error.statusCode, {
            type: error.type,
            message: error.message,
            details: error.details,
        });
    }

    // Unknown errors
    if (process.env.NODE_ENV !== "production") {
        console.error(error);
    } else {
        // En producción loggea igual, pero sin exponer al cliente
        console.error("[Unhandled error]", error); // o usa tu logger (pino, winston)
    }

    return errorResponse(res, 500, {
        type: "internal_error",
        message: "Something went wrong",
    });
}