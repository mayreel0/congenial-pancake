"use client";

import { useState } from "react";
import { useDismissOnOutsideClick } from "../hooks/useDismissOnOutsideClick";
import {
  POPOVER_EXIT_MS,
  useAnimatedPresence,
} from "../hooks/useAnimatedPresence";
import { HeatmapCalendar, type HeatmapCalendarProps } from "./HeatmapCalendar";
import type { FilterRowBreakpoint } from "./filterRowBreakpoint";

// Container-query breakpoints (`@min-[Npx]:`), see filterRowBreakpoint.ts
// for why — and ui/TextField's identical map for why these are written
// out as literal class strings rather than built by interpolation.
const CONTAINER_WIDTH_CLASSES: Record<FilterRowBreakpoint, string> = {
  "740": "w-full @min-[740px]:w-auto",
  "840": "w-full @min-[840px]:w-auto",
  "960": "w-full @min-[960px]:w-auto",
};
const TRIGGER_WIDTH_CLASSES: Record<FilterRowBreakpoint, string> = {
  "740": "w-full @min-[740px]:w-48",
  "840": "w-full @min-[840px]:w-48",
  "960": "w-full @min-[960px]:w-48",
};

type HeatmapCalendarFieldProps = HeatmapCalendarProps & {
  label: string;
  placeholder: string;
  // Defaults to the raw "YYYY-MM-DD" string — apps pass their own Korean
  // date formatter (this package has no app to import one from).
  formatDate?(date: string): string;
  // Which breakpoint the fixed width kicks in at — see
  // filterRowBreakpoint.ts.
  breakpoint?: FilterRowBreakpoint;
};

// A compact trigger (styled like ui/TextField) that opens HeatmapCalendar
// in an anchored popover on click, instead of rendering the full grid
// inline — the grid at full width was too large to sit permanently on the
// page (2026-09-02 feedback on PR #130). Mirrors MoreMenu's open-state +
// useDismissOnOutsideClick pattern. For a date *range*, use two of these
// (시작일/종료일) cross-constrained via minDate/maxDate rather than one
// field in a range-select mode — a single field showing both ends wrapped
// to two lines, and re-picking either end always discarded the other.
export function HeatmapCalendarField(props: HeatmapCalendarFieldProps) {
  const {
    label,
    placeholder,
    formatDate = (date) => date,
    breakpoint = "740",
    ...calendarProps
  } = props;
  const [open, setOpen] = useState(false);
  const containerRef = useDismissOnOutsideClick<HTMLDivElement>(open, () =>
    setOpen(false),
  );
  const shouldRender = useAnimatedPresence(open, POPOVER_EXIT_MS);

  const displayText = calendarProps.selected
    ? formatDate(calendarProps.selected)
    : placeholder;

  return (
    // Not inline-block — the fixed width uses a breakpoint-keyed class
    // (not inline-block's shrink-to-fit) so the trigger button's own
    // fixed width below has an unambiguous containing block at every
    // breakpoint — see ui/TextField's identical breakpoint comment for
    // why the fixed width only kicks in there.
    <div
      className={`relative ${CONTAINER_WIDTH_CLASSES[breakpoint]}`}
      ref={containerRef}
    >
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <button
        aria-expanded={open}
        aria-label={label}
        // text-base (not text-sm) to match TextField/Select's height when
        // sitting next to either in a filter row — see Select's identical
        // comment for the same fix.
        className={`${TRIGGER_WIDTH_CLASSES[breakpoint]} rounded-lg border border-line bg-surface px-3 py-2 text-left text-base text-foreground outline-none transition hover:border-primary focus:border-primary`}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        {displayText}
      </button>
      {shouldRender && (
        <div
          aria-label={`${label} 달력`}
          className={`absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-line bg-surface p-3 shadow-sm ${
            open ? "onseol-popover-enter" : "onseol-popover-leave"
          }`}
        >
          <HeatmapCalendar
            {...calendarProps}
            onSelect={(date) => {
              calendarProps.onSelect(date);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
