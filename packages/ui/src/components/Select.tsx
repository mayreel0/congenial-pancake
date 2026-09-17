import type { SelectHTMLAttributes } from "react";

// Same input classes/height as TextField (px-3 py-2 text-base) — a native
// <select> styled with the smaller px-2 py-1.5 text-sm inputs elsewhere
// used to sit visibly shorter than a TextField right next to it in a
// filter bar.
type SelectProps = {
  label: string;
  id: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">;

export function Select({ label, id, children, ...rest }: SelectProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-muted" htmlFor={id}>
        {label}
      </label>
      <select
        // w-full sm:w-auto — this had no width class before, so it stayed
        // content-sized even after TextField/HeatmapCalendarField above
        // switched to full-width on mobile, leaving it the only field not
        // stretching across a stacked filter row. sm and up reverts to the
        // original content-sized behavior.
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary sm:w-auto"
        id={id}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
