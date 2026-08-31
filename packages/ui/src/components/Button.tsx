import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// "primary" was the only style found duplicated across apps/web and
// apps/admin (bg-primary + shadow-sm + hover:opacity-90 + disabled state)
// — see docs/decisions/2026-08-26-onseol-refactoring-pass-decisions.md.
// "secondary" was added once a second real need showed up (a cancel action
// next to a primary submit, e.g. NicknameSection's edit form) — an
// outlined/muted button using the same border/surface tokens as the rest
// of the UI, not a bespoke color.
export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "sm" | "md";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-10 px-4",
  md: "h-11 px-4",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:opacity-90",
  secondary:
    "border border-line bg-surface text-foreground hover:bg-surface-muted",
};

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean | undefined,
): string {
  return [
    "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? "w-full" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
};

type ButtonAsButtonProps = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & {
    href?: never;
  };

type ButtonAsLinkProps = ButtonOwnProps & {
  href: string;
};

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

// Renders as a Next <Link> when href is given, otherwise a <button> — both
// need the exact same visual style at several call sites (a CTA that
// happens to navigate vs. one that submits a form), so this covers both
// instead of forcing every caller to wrap a styled <a>/<button> itself.
export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", fullWidth, children } = props;
  const className = buttonClassName(variant, size, fullWidth);

  if (props.href !== undefined) {
    return (
      <Link className={className} href={props.href}>
        {children}
      </Link>
    );
  }

  // Bound only to exclude them from `rest` below — no-unused-vars doesn't
  // recognize destructuring-to-omit as a use.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    variant: _variant,
    size: _size,
    fullWidth: _fullWidth,
    children: _children,
    href: _href,
    ...rest
  } = props;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return (
    <button className={className} type="button" {...rest}>
      {children}
    </button>
  );
}
