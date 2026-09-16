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
        className="rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary"
        id={id}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
