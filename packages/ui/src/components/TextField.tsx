import type { InputHTMLAttributes } from "react";

// Only the two label styles actually found in use: a plain muted label for
// simple login-style fields, and a bolder foreground label for fields that
// have explanatory hint text (apps/admin's settings form). Tied to hint's
// presence rather than a separate prop, since that's true for every real
// call site today — see docs/decisions/2026-08-26-onseol-refactoring-pass-
// decisions.md.
export type TextFieldWidth = "full" | "compact" | "search";

// Below sm (640px), compact/search both go full-width — a fixed 160/256px
// field sits in a sea of unused space on a narrow screen instead of
// filling it, and its container row switches to a vertical stack at the
// same breakpoint (see e.g. /records' filter row) so full-width here
// doesn't fight a still-horizontal layout. sm and up keeps the original
// fixed width, matching ui/Pagination's existing flex-col→sm:flex-row
// precedent for "mobile stacks, sm+ doesn't."
const WIDTH_CLASSES: Record<TextFieldWidth, string> = {
  full: "w-full",
  compact: "w-full sm:w-40",
  // A free-text search box needs more room to type in than a date/select
  // filter next to it — 160px (compact) reads as clipped the moment
  // someone types more than a couple of words.
  search: "w-full sm:w-64",
};

type TextFieldProps = {
  label: string;
  hint?: string;
  id: string;
  width?: TextFieldWidth;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export function TextField({
  label,
  hint,
  id,
  width = "full",
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
        className={`${WIDTH_CLASSES[width]} rounded-lg border bg-surface px-3 py-2 text-base text-foreground outline-none ${
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
