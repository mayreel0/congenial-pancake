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
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

// Query-string values are always strings (or absent) — these mirror the
// backend's parsePageParam/parsePageSizeParam so a malformed or
// off-whitelist value in a shared/bookmarked URL falls back quietly
// instead of breaking the page.
export function parsePageParam(page: string | undefined): number {
  const parsed = Number(page);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

export function parsePageSizeParam(pageSize: string | undefined): number {
  const parsed = Number(pageSize);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_PAGE_SIZE;
}
