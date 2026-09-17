import type { SelectHTMLAttributes } from "react";
import type { FilterRowBreakpoint } from "./filterRowBreakpoint";

// w-full below the breakpoint, content-sized (w-auto) at/above it — see
// ui/TextField's identical breakpoint comment. Container-query
// breakpoints (`@min-[Npx]:`), see filterRowBreakpoint.ts. Written out as
// literal class strings per breakpoint, same reason as TextField's map.
const WIDTH_CLASSES: Record<FilterRowBreakpoint, string> = {
  "740": "w-full @min-[740px]:w-auto",
  "840": "w-full @min-[840px]:w-auto",
  "960": "w-full @min-[960px]:w-auto",
};

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
  // Which breakpoint the content-sized width kicks in at — see
  // filterRowBreakpoint.ts.
  breakpoint?: FilterRowBreakpoint;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">;

export function Select({
  label,
  id,
  breakpoint = "740",
  children,
  ...rest
}: SelectProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-muted" htmlFor={id}>
        {label}
      </label>
      <select
        className={`h-[42px] ${WIDTH_CLASSES[breakpoint]} rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary`}
        id={id}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
