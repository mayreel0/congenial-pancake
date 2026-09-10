"use client";

import { useEffect, useState } from "react";

// 0 under test, same reasoning as SKELETON_MIN_DISPLAY_MS/POPOVER_EXIT_MS —
// component tests assert on the disabled/label state directly, not a timed
// spinner reveal.
export const SUBMIT_SPINNER_DELAY_MS =
  process.env.NODE_ENV === "test" ? 0 : 200;

// The opposite problem from useMinDisplayDuration: that hook holds a
// skeleton open a *minimum* time so a fast load doesn't flash. This one
// holds a submit spinner *back* so a fast request never flashes one at all
// — nothing here ever delays the actual result, hiding is always instant
// and tied directly to `pending` going false; only showing waits `delayMs`.
//
// Disabling the button must stay tied to the raw `pending` value at the
// call site, not this hook's return value — this only governs the visual
// spinner. Using the delayed value for `disabled` too would leave the
// button clickable during the pre-delay window.
export function useDelayedPending(pending: boolean, delayMs: number): boolean {
  const [shown, setShown] = useState(false);
  const [prevPending, setPrevPending] = useState(pending);

  // "Adjusting state when a prop changes" (same pattern as
  // useAnimatedPresence/useMinDisplayDuration) — resets the instant
  // `pending` itself goes false, no extra render-after-effect lag on hiding.
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (!pending) setShown(false);
  }

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [pending, delayMs]);

  return pending && shown;
}
