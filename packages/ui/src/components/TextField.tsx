import type { InputHTMLAttributes } from "react";

export type TextFieldWidth = "full" | "compact" | "search" | "flexible";

// Below sm (640px), compact/search/flexible all go full-width so fields stack cleanly
// on a narrow screen without leaving awkward whitespace. sm and up keeps
// the fixed width (compact=w-40, search=w-64) or expands to fill available space (flexible=flex-1).
const INPUT_WIDTH_CLASSES: Record<TextFieldWidth, string> = {
  full: "w-full",
  compact: "w-full sm:w-40",
  search: "w-full sm:w-64",
  flexible: "w-full",
};

const WRAPPER_WIDTH_CLASSES: Record<TextFieldWidth, string> = {
  full: "w-full",
  compact: "w-full sm:w-auto",
  search: "w-full sm:w-auto",
  flexible: "w-full sm:flex-1 sm:min-w-[180px]",
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
    <div className={`${WRAPPER_WIDTH_CLASSES[width]} space-y-1`}>
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
        className={`${INPUT_WIDTH_CLASSES[width]} rounded-lg border bg-surface px-3 py-2 text-base text-foreground outline-none ${
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
