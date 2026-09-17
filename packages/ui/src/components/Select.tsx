import type { SelectHTMLAttributes } from "react";

// Same padding/font classes as TextField (px-3 py-2 text-base), but that
// alone isn't enough — Chromium ignores line-height on native <select>,
// so h-[42px] pins it to the exact height TextField/HeatmapCalendarField compute to.
// Below sm (640px), goes full-width to stack cleanly. sm and up keeps
// content-sized width with a sensible min-width (120px).
type SelectProps = {
  label: string;
  id: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">;

export function Select({
  label,
  id,
  children,
  ...rest
}: SelectProps) {
  return (
    <div className="w-full space-y-1 sm:w-auto">
      <label className="block text-sm text-muted" htmlFor={id}>
        {label}
      </label>
      <select
        className="h-[42px] w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary sm:w-auto sm:min-w-[120px]"
        id={id}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
