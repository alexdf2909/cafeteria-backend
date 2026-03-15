import {PaginationMeta} from "./pagination.helpers";

export interface ApiSuccess<T> {
    success: true;
    data: T;
    message?: string;
    meta?: PaginationMeta;
}

export interface ApiError {
    success: false;
    error: {
        type: string;
        message: string;
        details?: unknown;
        fields?: unknown;
    };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;