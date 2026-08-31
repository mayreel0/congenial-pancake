// Now client-controlled (whitelist below), but still needs a default — 10
// keeps a first paint light, with 20/50 available for browsing more per
// page.
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

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

// `page`/`pageSize` query params arrive as raw strings (no global
// ValidationPipe `transform`, and we don't want to flip that on globally
// just for this) — anything invalid silently falls back to the default
// rather than erroring, since a stale/malformed param in a URL shouldn't
// break the page.
export function parsePageParam(page: string | undefined): number {
  const parsed = Number(page);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

// Whitelisted, not "any positive integer" — an arbitrarily large pageSize
// from a client would defeat the point of paginating at all.
export function parsePageSizeParam(pageSize: string | undefined): number {
  const parsed = Number(pageSize);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_PAGE_SIZE;
}
