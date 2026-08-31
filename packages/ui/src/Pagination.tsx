type PaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  // Which sizes the selector offers — the app decides this policy
  // (apps/web/app/lib/pagination.ts), not this shared component.
  pageSizeOptions: readonly number[];
  onPageChange(page: number): void;
  onPageSizeChange(pageSize: number): void;
};

// Windows down to first/last + current ±1 with "…" gaps once there are more
// than 7 pages, rather than rendering every page number — /read (day pages)
// and /records (date-range pages) can both realistically have dozens of
// pages for an active account.
function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const keep = new Set(
    [1, 2, total - 1, total, current - 1, current, current + 1].filter(
      (p) => p >= 1 && p <= total,
    ),
  );
  const sorted = [...keep].sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (p - previous > 1) result.push("ellipsis");
    result.push(p);
    previous = p;
  }
  return result;
}

const buttonBaseClassName =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40";

// Always renders (even at totalPages === 1) — the page-size selector needs
// to stay reachable regardless of how many pages the current size produces,
// e.g. someone on a single page of 10 might still want to switch to 50.
export function Pagination({
  page,
  totalPages,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <label className="flex items-center gap-2 text-xs text-muted">
        페이지당
        <select
          className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.currentTarget.value))}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}개
            </option>
          ))}
        </select>
      </label>
      <nav aria-label="페이지" className="flex items-center gap-1">
        <button
          aria-label="이전 페이지"
          className={`${buttonBaseClassName} text-muted hover:bg-surface-muted`}
          disabled={page <= 1}
          type="button"
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </button>
        {pageNumbers(page, totalPages).map((entry, index) =>
          entry === "ellipsis" ? (
            <span
              className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-muted"
              key={`ellipsis-${index}`}
            >
              …
            </span>
          ) : (
            <button
              aria-current={entry === page ? "page" : undefined}
              className={
                entry === page
                  ? `${buttonBaseClassName} bg-primary font-semibold text-primary-foreground`
                  : `${buttonBaseClassName} text-foreground hover:bg-surface-muted`
              }
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
            >
              {entry}
            </button>
          ),
        )}
        <button
          aria-label="다음 페이지"
          className={`${buttonBaseClassName} text-muted hover:bg-surface-muted`}
          disabled={page >= totalPages}
          type="button"
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </button>
      </nav>
    </div>
  );
}
