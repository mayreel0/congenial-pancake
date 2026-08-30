// Fixed, not client-controlled — keeps every paginated endpoint predictable
// and avoids a client requesting an unbounded page size.
export const DEFAULT_PAGE_SIZE = 20;

export type PaginatedDto<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function toPaginatedDto<T>(
  items: T[],
  page: number,
  totalItems: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): PaginatedDto<T> {
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

// `page` query params arrive as raw strings (no global ValidationPipe
// `transform`, and we don't want to flip that on globally just for this) —
// anything not a positive integer silently falls back to page 1 rather than
// erroring, since a stale/malformed page param in a URL shouldn't break the
// page.
export function parsePageParam(page: string | undefined): number {
  const parsed = Number(page);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}
