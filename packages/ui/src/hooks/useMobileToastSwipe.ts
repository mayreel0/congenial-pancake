"use client";

import { useEffect, type RefObject } from "react";

const MOBILE_WIDTH = "(max-width: 639.98px)";
const SWIPE_LOCK_PX = 12;
const SWIPE_DISMISS_PX = 80;
const LONG_PRESS_MS = 500;
const HORIZONTAL_RATIO = 2;
const CLICK_SUPPRESSION_MS = 400;
const INTERACTIVE =
  'button, a, input, textarea, select, label, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="slider"], [role="option"], [tabindex]';

export function useMobileToastSwipe(
  ref: RefObject<HTMLDivElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    const box = ref.current;
    if (!box) return;

    let gesture: {
      id: number;
      x: number;
      y: number;
      started: number;
      horizontal: boolean;
    } | null = null;
    let suppressClick = false;
    let suppressUntil = 0;
    const originalTransform = box.style.transform;
    const originalTransition = box.style.transition;
    let moved = false;
    const hasSelection = () => Boolean(window.getSelection()?.toString());
    const reset = () => {
      gesture = null;
      if (!moved) return;
      // Restore the CSS transition (including motion-reduce) for snap-back.
      box.style.transition = originalTransition;
      box.style.transform = originalTransform;
      moved = false;
    };

    function start(event: TouchEvent) {
      reset();
      suppressClick = false;
      suppressUntil = 0;
      if (
        event.touches.length !== 1 ||
        !window.matchMedia(MOBILE_WIDTH).matches ||
        hasSelection()
      ) return;
      const target = event.target;
      if (!box || !(target instanceof Element)) return;
      const control = target.closest(INTERACTIVE);
      if (control && box.contains(control)) return;
      const finger = event.touches[0];
      gesture = {
        id: finger.identifier,
        x: finger.clientX,
        y: finger.clientY,
        started: event.timeStamp,
        horizontal: false,
      };
    }

    function move(event: TouchEvent) {
      if (!gesture || !box) return;
      const finger = event.touches[0];
      if (
        event.touches.length !== 1 ||
        finger.identifier !== gesture.id ||
        hasSelection() ||
        !window.matchMedia(MOBILE_WIDTH).matches
      ) {
        reset();
        return;
      }
      const x = Math.abs(finger.clientX - gesture.x);
      const y = Math.abs(finger.clientY - gesture.y);
      if (!gesture.horizontal) {
        // Lock the first deliberate direction; scrolling and long-press
        // selection must never turn into dismissal later in the same touch.
        if (
          event.timeStamp - gesture.started >= LONG_PRESS_MS ||
          (Math.max(x, y) >= SWIPE_LOCK_PX && x < y * HORIZONTAL_RATIO)
        ) {
          reset();
          return;
        }
        if (x < SWIPE_LOCK_PX) return;
        gesture.horizontal = true;
        suppressClick = true;
      }
      if (!event.cancelable) {
        reset();
        return;
      }
      event.preventDefault();
      // transform composes with Tailwind's separate translate property used
      // by the entrance animation; no easing while following the finger.
      box.style.transition = "none";
      box.style.transform = `translateX(${finger.clientX - gesture.x}px)`;
      moved = true;
    }

    function end(event: TouchEvent) {
      const finished = gesture;
      reset();
      suppressUntil = Date.now() + CLICK_SUPPRESSION_MS;
      if (
        !finished?.horizontal ||
        event.touches.length ||
        hasSelection() ||
        !window.matchMedia(MOBILE_WIDTH).matches
      ) return;
      const finger = Array.from(event.changedTouches).find(
        (touch) => touch.identifier === finished.id,
      );
      if (!finger) return;
      const x = Math.abs(finger.clientX - finished.x);
      const y = Math.abs(finger.clientY - finished.y);
      if (x >= SWIPE_DISMISS_PX && x >= y * HORIZONTAL_RATIO) onClose();
    }

    function cancel() {
      reset();
      suppressUntil = Date.now() + CLICK_SUPPRESSION_MS;
    }

    function click(event: MouseEvent) {
      if (!suppressClick || Date.now() > suppressUntil || event.detail === 0) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    }

    // A non-passive listener on this surface can cancel only recognized
    // horizontal gestures, leaving native scrolling, zoom and controls alone.
    box.addEventListener("touchstart", start, { passive: true });
    box.addEventListener("touchmove", move, { passive: false });
    box.addEventListener("touchend", end);
    box.addEventListener("touchcancel", cancel);
    box.addEventListener("scroll", reset, true);
    box.addEventListener("click", click, true);
    window.addEventListener("resize", cancel);
    return () => {
      box.style.transition = originalTransition;
      box.style.transform = originalTransform;
      box.removeEventListener("touchstart", start);
      box.removeEventListener("touchmove", move);
      box.removeEventListener("touchend", end);
      box.removeEventListener("touchcancel", cancel);
      box.removeEventListener("scroll", reset, true);
      box.removeEventListener("click", click, true);
      window.removeEventListener("resize", cancel);
    };
  }, [ref, onClose]);
}
