import type { InputHTMLAttributes } from "react";

// Only the two label styles actually found in use: a plain muted label for
// simple login-style fields, and a bolder foreground label for fields that
// have explanatory hint text (apps/admin's settings form). Tied to hint's
// presence rather than a separate prop, since that's true for every real
// call site today — see docs/decisions/2026-08-26-onseol-refactoring-pass-
// decisions.md.
export type TextFieldWidth = "full" | "compact";

const WIDTH_CLASSES: Record<TextFieldWidth, string> = {
  full: "w-full",
  compact: "w-40",
};

type TextFieldProps = {
  label: string;
  hint?: string;
  id: string;
  width?: TextFieldWidth;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export function TextField({
  label,
  hint,
  id,
  width = "full",
  ...rest
}: TextFieldProps) {
  return (
    <div className="space-y-1">
      <label
        className={
          hint ? "text-sm font-semibold text-foreground" : "text-sm text-muted"
        }
        htmlFor={id}
      >
        {label}
      </label>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      <input
        className={`${WIDTH_CLASSES[width]} rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary`}
        id={id}
        {...rest}
      />
    </div>
  );
}
