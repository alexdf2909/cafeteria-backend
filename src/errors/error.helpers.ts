import { AppError } from "./AppError";

export function badRequest(message = "Bad request", details?: unknown) {
    return new AppError(message, 400, details, "bad_request");
}

export function unauthorized(message = "Unauthorized") {
    return new AppError(message, 401, undefined, "unauthorized");
}

export function forbidden(message = "Forbidden") {
    return new AppError(message, 403, undefined, "forbidden");
}

export function notFound(resource = "Resource") {
    return new AppError(`${resource} not found`, 404, undefined, "not_found");
}

export function conflict(message = "Conflict") {
    return new AppError(message, 409, undefined, "conflict");
}

export function internalError(message = "Internal server error") {
    return new AppError(message, 500, undefined, "internal_error");
}