import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

// A single pulsing placeholder block — pages compose this into whatever
// card shape they're loading (see /read, /records) rather than this
// component trying to model every card layout itself.
export function Skeleton({ className = "", ...rest }: SkeletonProps) {
  // Callers override the shape with their own rounded-* class (e.g.
  // "h-9 w-9 rounded-full" for an avatar). Simply appending className after
  // the hardcoded "rounded-md" below doesn't work — Tailwind's generated
  // stylesheet orders utilities by its own rules, not by where they appear
  // in the class attribute, so rounded-md silently won regardless of
  // caller order (confirmed via computed style, 2026-09-14: rendered as
  // 6px even with rounded-full/rounded-lg present). Only apply the default
  // when the caller hasn't specified their own rounding, so there's never
  // a same-specificity conflict to lose.
  const hasCustomRounding = className
    .split(/\s+/)
    .some((token) => token === "rounded" || token.startsWith("rounded-"));

  return (
    <div
      aria-hidden="true"
      className={[
        "animate-pulse bg-surface-muted",
        hasCustomRounding ? "" : "rounded-md",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}
