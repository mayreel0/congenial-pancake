import type { InputHTMLAttributes } from "react";
import type { FilterRowBreakpoint } from "./filterRowBreakpoint";

// Only the two label styles actually found in use: a plain muted label for
// simple login-style fields, and a bolder foreground label for fields that
// have explanatory hint text (apps/admin's settings form). Tied to hint's
// presence rather than a separate prop, since that's true for every real
// call site today — see docs/decisions/2026-08-26-onseol-refactoring-pass-
// decisions.md.
export type TextFieldWidth = "full" | "compact" | "search";

// Below its breakpoint, compact/search both go full-width — a fixed
// 160/256px field sits in a sea of unused space on a narrow container
// instead of filling it, and the row it sits in switches to a vertical
// stack at the same breakpoint (see e.g. /records' filter row) so
// full-width here doesn't fight a still-horizontal layout. At/above the
// breakpoint it keeps the original fixed width. These are container
// query breakpoints (`@min-[Npx]:`, Tailwind v4), not viewport ones —
// see filterRowBreakpoint.ts for why. Written out as literal class
// strings (not built by string interpolation) since Tailwind's build
// only picks up classes that appear verbatim in source.
const WIDTH_CLASSES: Record<TextFieldWidth, Record<FilterRowBreakpoint, string>> = {
  full: { "740": "w-full", "840": "w-full", "960": "w-full" },
  compact: {
    "740": "w-full @min-[740px]:w-40",
    "840": "w-full @min-[840px]:w-40",
    "960": "w-full @min-[960px]:w-40",
  },
  // A free-text search box needs more room to type in than a date/select
  // filter next to it — 160px (compact) reads as clipped the moment
  // someone types more than a couple of words.
  search: {
    "740": "w-full @min-[740px]:w-64",
    "840": "w-full @min-[840px]:w-64",
    "960": "w-full @min-[960px]:w-64",
  },
};

type TextFieldProps = {
  label: string;
  hint?: string;
  id: string;
  width?: TextFieldWidth;
  // Which container-query breakpoint the fixed width kicks in at — see
  // filterRowBreakpoint.ts. Only matters for compact/search; "full" is
  // always full-width regardless. Irrelevant for a standalone field not
  // sharing a row with others, so the default is arbitrary there.
  breakpoint?: FilterRowBreakpoint;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export function TextField({
  label,
  hint,
  id,
  width = "full",
  breakpoint = "740",
  error,
  ...rest
}: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <label
        className={
          hint
            ? "block text-sm font-semibold text-foreground"
            : "block text-sm text-muted"
        }
        htmlFor={id}
      >
        {label}
      </label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className={`${WIDTH_CLASSES[width][breakpoint]} rounded-lg border bg-surface px-3 py-2 text-base text-foreground outline-none ${
          error
            ? "border-red-600 focus:border-red-600"
            : "border-line focus:border-primary"
        }`}
        id={id}
        {...rest}
      />
      {error && (
        <p className="text-xs text-red-600" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
