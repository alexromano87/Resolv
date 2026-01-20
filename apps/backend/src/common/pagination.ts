export type PaginationOptions = {
  page?: number;
  limit?: number;
};

export const DEFAULT_PAGINATION_LIMIT = 50;

export const normalizePagination = (
  page?: number,
  limit?: number,
  maxLimit = 100,
  defaultLimit = DEFAULT_PAGINATION_LIMIT,
) => {
  const safeLimit = Math.min(Math.max(limit ?? defaultLimit, 1), maxLimit);
  const safePage = Math.max(page ?? 1, 1);
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
};
