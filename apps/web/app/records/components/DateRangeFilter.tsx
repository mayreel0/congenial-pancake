"use client";

import { TextField } from "ui/TextField";

type DateRangeFilterProps = {
  idPrefix: string;
  from: string | undefined;
  to: string | undefined;
  onFromChange(value: string | undefined): void;
  onToChange(value: string | undefined): void;
};

// Native <input type="date"> rather than a custom calendar widget — plain
// and accessible, no extra dependency. Empty string (cleared field) maps
// back to undefined, matching the "no bound" meaning used everywhere else
// here.
export function DateRangeFilter({
  idPrefix,
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <TextField
        id={`${idPrefix}-from`}
        label="시작일"
        type="date"
        value={from ?? ""}
        width="compact"
        onChange={(event) => onFromChange(event.currentTarget.value || undefined)}
      />
      <TextField
        id={`${idPrefix}-to`}
        label="종료일"
        type="date"
        value={to ?? ""}
        width="compact"
        onChange={(event) => onToChange(event.currentTarget.value || undefined)}
      />
    </div>
  );
}
