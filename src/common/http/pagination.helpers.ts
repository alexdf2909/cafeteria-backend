export interface PaginationParams {
    currentPage: number;
    limitPerPage: number;
    offset: number;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export function buildPagination(page: number, limit: number): PaginationParams {
    const currentPage = Math.max(1, page);
    const limitPerPage = Math.max(1, limit);
    const offset = (currentPage - 1) * limitPerPage;
    return { currentPage, limitPerPage, offset };
}

export function buildPaginationMeta(
    page: number,
    limit: number,
    total: number
): PaginationMeta {
    return {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
}