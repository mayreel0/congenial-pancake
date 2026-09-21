"use client";

import { useEffect, type ReactNode } from "react";
import {
  POPOVER_EXIT_MS,
  useAnimatedPresence,
} from "../hooks/useAnimatedPresence";

type PopoverDialogProps = {
  open: boolean;
  // Accessible name only — the surface deliberately has no visible title.
  label: string;
  onClose(): void;
  // Placement and size for sm (640px) and up, where this stays an anchored
  // popover — every class here must be sm:-prefixed (e.g. "sm:absolute
  // sm:right-0 sm:top-full sm:mt-1 sm:w-32"). Below sm those don't apply and
  // it's a centered dialog over a dimmed backdrop instead.
  popoverClassName: string;
  children: ReactNode;
};

// One surface for the small anchored popovers (MoreMenu, the calendar field,
// the hold panel): on a phone they were tiny, easy to miss, and — anchored
// beside their trigger — could hang off the edge of the screen and widen the
// page. Switching by CSS alone (`sm:contents` drops the backdrop's own box at
// sm+, leaving just the popover) means no JS width check and no hydration
// mismatch.
//
// Render this inside the trigger's `relative` container: at sm+ the popover
// positions against it, and the container's useDismissOnOutsideClick keeps
// handling outside clicks there. The backdrop tap below is what closes it
// below sm, where the backdrop covers the page.
export function PopoverDialog({
  open,
  label,
  onClose,
  popoverClassName,
  children,
}: PopoverDialogProps) {
  const shouldRender = useAnimatedPresence(open, POPOVER_EXIT_MS);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-5 sm:contents ${
        open ? "onseol-dialog-backdrop-enter" : "onseol-dialog-backdrop-leave"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-label={label}
        className={`w-full max-w-sm overflow-hidden rounded-lg border border-line bg-surface shadow-sm sm:z-20 ${popoverClassName} ${
          open ? "onseol-dialog-box-enter" : "onseol-dialog-box-leave"
        }`}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}
