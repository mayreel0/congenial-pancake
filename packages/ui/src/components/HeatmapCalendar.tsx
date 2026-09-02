"use client";

type DayCount = { date: string; count: number };

type HeatmapCalendarBaseProps = {
  // "YYYY-MM" — the month currently displayed.
  month: string;
  onMonthChange(month: string): void;
  // Counts for the visible month (and, harmlessly, any other month —
  // only entries matching a rendered cell's date are used). Days with no
  // matching entry render as count 0.
  counts: DayCount[];
};

type SingleModeProps = HeatmapCalendarBaseProps & {
  mode: "single";
  selected: string | undefined;
  onSelect(date: string): void;
  // Cells after this date (inclusive of neither/exclusive semantics: dates
  // > maxDate) render disabled and unclickable — /read never browses today
  // or a future day, since today's list is still accumulating.
  maxDate?: string;
};

type RangeModeProps = HeatmapCalendarBaseProps & {
  mode: "range";
  from: string | undefined;
  to: string | undefined;
  onRangeChange(from: string | undefined, to: string | undefined): void;
};

export type HeatmapCalendarProps = SingleModeProps | RangeModeProps;

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// "YYYY-MM" -> "YYYY-MM-DD" range (first through last day of month) plus
// weekday-of-1st arithmetic — kept local rather than importing an app's
// date helpers, since this package has no app to depend on.
function daysInMonth(monthAnchor: string): string[] {
  const [year, month] = monthAnchor.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: lastDay }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    return `${monthAnchor}-${day}`;
  });
}

function weekdayOf(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function shiftMonth(monthAnchor: string, months: number): string {
  const [year, month] = monthAnchor.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatKoreanMonth(monthAnchor: string): string {
  const [year, month] = monthAnchor.split("-").map(Number);
  return `${year}년 ${month}월`;
}

// Relative to this month's own max count, not a fixed absolute scale — a
// quiet month and a busy month both get a meaningful spread of intensity
// instead of every cell landing in the same bucket. Text color is paired
// with each tier (not with selection) since the darkest tier needs
// primary-foreground for contrast regardless of whether the cell is
// selected.
function intensityClassNames(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "bg-surface-muted text-foreground";
  const ratio = count / maxCount;
  if (ratio > 0.75) return "bg-primary text-primary-foreground";
  if (ratio > 0.5) return "bg-primary/70 text-primary-foreground";
  if (ratio > 0.25) return "bg-primary/40 text-foreground";
  return "bg-primary/20 text-foreground";
}

const navButtonClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40";

export function HeatmapCalendar(props: HeatmapCalendarProps) {
  const { month, onMonthChange, counts } = props;
  const countByDate = new Map(counts.map((entry) => [entry.date, entry.count]));
  const maxCount = Math.max(0, ...counts.map((entry) => entry.count));
  const dates = daysInMonth(month);
  const leadingBlanks = weekdayOf(dates[0]);

  function isSelected(date: string): boolean {
    if (props.mode === "single") return date === props.selected;
    if (!props.from) return false;
    if (!props.to) return date === props.from;
    return date >= props.from && date <= props.to;
  }

  function isDisabled(date: string): boolean {
    return props.mode === "single" && props.maxDate !== undefined && date > props.maxDate;
  }

  function handleClick(date: string): void {
    if (props.mode === "single") {
      props.onSelect(date);
      return;
    }
    // A complete range (or no range yet) starts a fresh selection; a
    // pending from-only selection completes it (swapping if the second
    // click lands before the first).
    if (!props.from || props.to) {
      props.onRangeChange(date, undefined);
      return;
    }
    if (date < props.from) {
      props.onRangeChange(date, props.from);
    } else {
      props.onRangeChange(props.from, date);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-3">
        <button
          aria-label="이전 달"
          className={navButtonClassName}
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
        >
          ‹
        </button>
        <p className="min-w-24 text-center text-sm font-semibold text-foreground">
          {formatKoreanMonth(month)}
        </p>
        <button
          aria-label="다음 달"
          className={navButtonClassName}
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {WEEKDAY_LABELS.map((label) => (
          <span aria-hidden="true" key={label}>
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {dates.map((date) => {
          const count = countByDate.get(date) ?? 0;
          const disabled = isDisabled(date);
          const selected = isSelected(date);
          const day = Number(date.slice(-2));
          return (
            <button
              aria-current={selected ? "date" : undefined}
              aria-label={`${date} (${count}개)`}
              className={`aspect-square rounded-md text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-30 ${intensityClassNames(count, maxCount)} ${
                selected
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-surface"
                  : "hover:ring-1 hover:ring-primary"
              }`}
              disabled={disabled}
              key={date}
              type="button"
              onClick={() => handleClick(date)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
