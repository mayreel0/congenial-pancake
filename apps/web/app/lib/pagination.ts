// Mirrors apps/api-server's common/pagination.dto.ts PaginatedDto<T> — every
// paginated list endpoint (/requests/feed, /requests/mine, /replies/mine)
// returns this shape.
export type PaginatedDto<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
