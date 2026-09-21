"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  POPOVER_EXIT_MS,
  useAnimatedPresence,
} from "../hooks/useAnimatedPresence";

// Below Tailwind's sm breakpoint (640px), where this is a modal dialog.
const DIALOG_WIDTH_QUERY = "(max-width: 639.98px)";

function subscribeToWidth(onChange: () => void): () => void {
  const query = window.matchMedia(DIALOG_WIDTH_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// Only feeds aria-modal — layout itself stays pure CSS. Server snapshot is
// false (the popover form), which is safe because the surface only renders
// after an interaction, never in the server HTML.
function useIsDialogWidth(): boolean {
  return useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(DIALOG_WIDTH_QUERY).matches,
    () => false,
  );
}

type PopoverDialogProps = {
  open: boolean;
  // Accessible name only — the surface deliberately has no visible title.
  label: string;
  onClose(): void;
  // Styling for the box. Placement and sizing that only belongs to the
  // anchored popover (sm/640px and up) must be sm:-prefixed (e.g.
  // "sm:absolute sm:right-0 sm:top-full sm:mt-1 sm:w-32") — below sm it's a
  // centered dialog over a dimmed backdrop and those don't apply. Styling
  // meant for both forms, like padding ("p-3"), goes in un-prefixed.
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
  const isDialogWidth = useIsDialogWidth();

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
      // cursor-pointer: iOS doesn't dispatch mouse/click events for taps on
      // a plain div, so without it a tap on the backdrop would never reach
      // onMouseDown below. The box resets it.
      className={`fixed inset-0 z-40 flex cursor-pointer items-center justify-center bg-black/40 px-5 sm:contents ${
        open ? "onseol-dialog-backdrop-enter" : "onseol-dialog-backdrop-leave"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-label={label}
        aria-modal={isDialogWidth || undefined}
        className={`w-full max-w-sm cursor-default overflow-hidden rounded-lg border border-line bg-surface shadow-sm sm:z-20 ${popoverClassName} ${
          open ? "onseol-dialog-box-enter" : "onseol-dialog-box-leave"
        }`}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}
