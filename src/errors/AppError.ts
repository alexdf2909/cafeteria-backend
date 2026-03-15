export class AppError extends Error {
    public readonly statusCode: number;
    public readonly details?: unknown;
    public readonly type: string;

    constructor(message: string, statusCode = 400, details?: unknown, type = "app_error") {
        super(message);

        this.name = "AppError";
        this.statusCode = statusCode;
        this.details = details;
        this.type = type;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace?.(this, this.constructor);
    }
}