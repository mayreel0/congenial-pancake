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

// Mirrors the backend's own default/whitelist — kept in sync manually,
// there's no shared package between apps/api-server and apps/web for this.
export const DEFAULT_PAGE_SIZE = 10;
