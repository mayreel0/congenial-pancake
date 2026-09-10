"use client";

import { useState, type ReactNode } from "react";
import { useDismissOnOutsideClick } from "../hooks/useDismissOnOutsideClick";
import {
  POPOVER_EXIT_MS,
  useAnimatedPresence,
} from "../hooks/useAnimatedPresence";
import { MoreIcon } from "../icons";

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
  // Kept mounted for POPOVER_EXIT_MS after `open` goes false so the leave
  // animation can actually play, instead of unmounting instantly.
  const shouldRender = useAnimatedPresence(open, POPOVER_EXIT_MS);

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-label="더보기"
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted transition hover:bg-surface-muted hover:text-foreground"
        title="더보기"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon className="h-4 w-4" />
      </button>
      {shouldRender && (
        <div
          aria-label={ariaLabel}
          className={`absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-lg border border-line bg-surface shadow-sm ${
            open ? "onseol-popover-enter" : "onseol-popover-leave"
          }`}
        >
          {items.map((item) => (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition hover:bg-surface-muted"
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
        </div>
      )}
    </div>
  );
}
