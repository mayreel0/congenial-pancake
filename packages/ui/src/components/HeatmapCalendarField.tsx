"use client";

import { useState } from "react";
import { useDismissOnOutsideClick } from "../hooks/useDismissOnOutsideClick";
import { HeatmapCalendar, type HeatmapCalendarProps } from "./HeatmapCalendar";

type HeatmapCalendarFieldProps = HeatmapCalendarProps & {
  label: string;
  placeholder: string;
  // Defaults to the raw "YYYY-MM-DD" string — apps pass their own Korean
  // date formatter (this package has no app to import one from).
  formatDate?(date: string): string;
};

// Early returns instead of a nested ternary — matches this repo's
// no-nested-ternary convention.
function fieldDisplayText(
  calendarProps: HeatmapCalendarProps,
  placeholder: string,
  formatDate: (date: string) => string,
): string {
  if (calendarProps.mode === "single") {
    if (!calendarProps.selected) return placeholder;
    return formatDate(calendarProps.selected);
  }
  if (!calendarProps.from) return placeholder;
  if (!calendarProps.to) return formatDate(calendarProps.from);
  return `${formatDate(calendarProps.from)} ~ ${formatDate(calendarProps.to)}`;
}

// A compact trigger (styled like ui/TextField) that opens HeatmapCalendar
// in an anchored popover on click, instead of rendering the full grid
// inline — the grid at full width was too large to sit permanently on the
// page (2026-09-02 feedback on PR #130). Mirrors MoreMenu's open-state +
// useDismissOnOutsideClick pattern.
export function HeatmapCalendarField(props: HeatmapCalendarFieldProps) {
  const { label, placeholder, formatDate = (date) => date, ...calendarProps } =
    props;
  const [open, setOpen] = useState(false);
  const containerRef = useDismissOnOutsideClick<HTMLDivElement>(open, () =>
    setOpen(false),
  );

  const displayText = fieldDisplayText(calendarProps, placeholder, formatDate);

  // Selecting a single date closes the popover immediately; a range only
  // closes once both ends are set (the from-only click keeps it open so the
  // second click can complete the range).
  const wrappedCalendarProps: HeatmapCalendarProps =
    calendarProps.mode === "single"
      ? {
          ...calendarProps,
          onSelect: (date) => {
            calendarProps.onSelect(date);
            setOpen(false);
          },
        }
      : {
          ...calendarProps,
          onRangeChange: (from, to) => {
            calendarProps.onRangeChange(from, to);
            if (to) setOpen(false);
          },
        };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <button
        aria-expanded={open}
        aria-label={label}
        className="w-56 rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm text-foreground outline-none transition hover:border-primary focus:border-primary"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        {displayText}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-line bg-surface p-3 shadow-sm">
          <HeatmapCalendar {...wrappedCalendarProps} />
        </div>
      )}
    </div>
  );
}
