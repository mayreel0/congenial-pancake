import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

// A single pulsing placeholder block — pages compose this into whatever
// card shape they're loading (see /read, /records) rather than this
// component trying to model every card layout itself.
export function Skeleton({ className = "", ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-surface-muted ${className}`}
      {...rest}
    />
  );
}
