"use client";

import { useState } from "react";
import { useDismissOnOutsideClick } from "../hooks/useDismissOnOutsideClick";
import {
  POPOVER_EXIT_MS,
  useAnimatedPresence,
} from "../hooks/useAnimatedPresence";
import { HeatmapCalendar, type HeatmapCalendarProps } from "./HeatmapCalendar";

type HeatmapCalendarFieldProps = HeatmapCalendarProps & {
  label: string;
  placeholder: string;
  // Defaults to the raw "YYYY-MM-DD" string — apps pass their own Korean
  // date formatter (this package has no app to import one from).
  formatDate?(date: string): string;
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
  const { label, placeholder, formatDate = (date) => date, ...calendarProps } =
    props;
  const [open, setOpen] = useState(false);
  const containerRef = useDismissOnOutsideClick<HTMLDivElement>(open, () =>
    setOpen(false),
  );
  const shouldRender = useAnimatedPresence(open, POPOVER_EXIT_MS);

  const displayText = calendarProps.selected
    ? formatDate(calendarProps.selected)
    : placeholder;

  return (
    // w-full sm:w-auto (not inline-block) so the trigger button's own
    // w-full sm:w-48 below has an unambiguous containing block at every
    // breakpoint — see ui/TextField's identical sm-breakpoint comment for
    // why the fixed width only kicks in at sm and up.
    <div className="relative w-full sm:w-auto" ref={containerRef}>
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <button
        aria-expanded={open}
        aria-label={label}
        // text-base (not text-sm) to match TextField/Select's height when
        // sitting next to either in a filter row — see Select's identical
        // comment for the same fix.
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-left text-base text-foreground outline-none transition hover:border-primary focus:border-primary sm:w-48"
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
