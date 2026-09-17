import type { SelectHTMLAttributes } from "react";

// Same padding/font classes as TextField (px-3 py-2 text-base), but that
// alone isn't enough — verified in a real browser that a native <select>
// ignores the `line-height` CSS property entirely when sizing itself
// (Chromium bases its intrinsic height on internal form-control metrics,
// not CSS line-height), so it still rendered 3px shorter than
// TextField/HeatmapCalendarField even with identical padding/border/font-
// size. h-[42px] pins it to the exact height those two compute to
// (py-2 + border + text-base's 24px line-height), the only thing that
// actually worked when tested.
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
        className="h-[42px] w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary sm:w-auto"
        id={id}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
