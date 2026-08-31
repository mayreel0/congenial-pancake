type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange(page: number): void;
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

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="페이지" className="flex items-center justify-center gap-1">
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
  );
}
