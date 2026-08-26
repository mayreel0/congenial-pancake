import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Only the "primary" style found duplicated across apps/web and apps/admin
// (bg-primary + shadow-sm + hover:opacity-90 + disabled state) — see
// docs/decisions/2026-08-26-onseol-refactoring-pass-decisions.md. Add a
// variant prop only once a second style is genuinely needed in more than
// one place; don't design it in ahead of time.
export type ButtonSize = "sm" | "md";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-10 px-4",
  md: "h-11 px-4",
};

function buttonClassName(size: ButtonSize, fullWidth: boolean | undefined): string {
  return [
    "inline-flex items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
    SIZE_CLASSES[size],
    fullWidth ? "w-full" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonOwnProps = {
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
  const { size = "md", fullWidth, children } = props;
  const className = buttonClassName(size, fullWidth);

  if (props.href !== undefined) {
    return (
      <Link className={className} href={props.href}>
        {children}
      </Link>
    );
  }

  // Bound only to exclude them from `rest` below — no-unused-vars doesn't
  // recognize destructuring-to-omit as a use.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { size: _size, fullWidth: _fullWidth, children: _children, href: _href, ...rest } = props;
  return (
    <button className={className} type="button" {...rest}>
      {children}
    </button>
  );
}
