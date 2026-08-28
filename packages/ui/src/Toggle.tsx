import type { InputHTMLAttributes } from "react";

// A real checkbox under the hood (native keyboard/focus/label semantics
// for free) visually styled as a switch via Tailwind's peer-* variants —
// not a styled <button role="switch">, so existing "wrap it in a <label>"
// call sites (RequestComposer, AnswerComposer) barely change.
type ToggleProps = {
  checked: boolean;
  onChange(checked: boolean): void;
  label: string;
  // Visible next to the switch by default — pass true when the label text
  // is already shown elsewhere and this is just for screen readers.
  labelHidden?: boolean;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "onChange" | "children"
>;

export function Toggle({
  checked,
  onChange,
  label,
  labelHidden = false,
  ...rest
}: ToggleProps) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted">
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          checked={checked}
          className="peer sr-only"
          role="switch"
          type="checkbox"
          onChange={(event) => onChange(event.currentTarget.checked)}
          {...rest}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-line transition peer-checked:bg-primary peer-disabled:opacity-50"
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface transition peer-checked:translate-x-4"
        />
      </span>
      {labelHidden ? <span className="sr-only">{label}</span> : label}
    </label>
  );
}
