"use client";

import { useState, type ReactNode } from "react";
import { useDismissOnOutsideClick } from "../hooks/useDismissOnOutsideClick";
import { MoreIcon } from "../icons";
import { PopoverDialog } from "./PopoverDialog";

type MoreMenuItem = {
  key: string;
  icon: ReactNode;
  label: string;
  onClick(): void;
};

type MoreMenuProps = {
  ariaLabel: string;
  items: MoreMenuItem[];
};

export function MoreMenu({ ariaLabel, items }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useDismissOnOutsideClick<HTMLDivElement>(open, () =>
    setOpen(false),
  );

  return (
    <div className="relative shrink-0" ref={containerRef}>
      {/* Below sm: a 40px tap target (the negative margin keeps the row's
          layout at the desktop 24px) with a larger icon, since the 24px
          button was too small to hit or notice on a phone. */}
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="더보기"
        className="-m-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-muted transition hover:bg-surface-muted hover:text-foreground sm:m-0 sm:h-6 sm:w-6"
        title="더보기"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon className="h-5 w-5 sm:h-4 sm:w-4" />
      </button>
      <PopoverDialog
        label={ariaLabel}
        open={open}
        popoverClassName="divide-y divide-line sm:absolute sm:right-0 sm:top-full sm:mt-1 sm:w-32 sm:divide-y-0"
        onClose={() => setOpen(false)}
      >
        {items.map((item) => (
          <button
            className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-base text-foreground transition hover:bg-surface-muted sm:min-h-0 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
            key={item.key}
            type="button"
            onClick={() => {
              setOpen(false);
              item.onClick();
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </PopoverDialog>
    </div>
  );
}
