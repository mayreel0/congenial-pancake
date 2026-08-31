import { formatKoreanDate } from "../../lib/kst-date";

type DayNavProps = {
  date: string;
  canGoNext: boolean;
  onPrevious(): void;
  onNext(): void;
};

const buttonClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40";

// /read is browsed one KST calendar day at a time, not as one continuously-
// scrolling feed — see docs/decisions/2026-08-31-onseol-read-records-
// pagination-decisions.md. "다음 날" stops at yesterday — today's list is
// still accumulating, so it isn't a completed day to browse yet.
export function DayNav({ date, canGoNext, onPrevious, onNext }: DayNavProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        aria-label="이전 날"
        className={buttonClassName}
        type="button"
        onClick={onPrevious}
      >
        ‹
      </button>
      <p className="min-w-40 text-center text-sm font-semibold text-foreground">
        {formatKoreanDate(date)}
      </p>
      <button
        aria-label="다음 날"
        className={buttonClassName}
        disabled={!canGoNext}
        type="button"
        onClick={onNext}
      >
        ›
      </button>
    </div>
  );
}
