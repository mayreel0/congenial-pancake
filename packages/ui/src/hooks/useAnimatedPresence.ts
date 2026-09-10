"use client";

import { useEffect, useState } from "react";

// Same "0 under test" reasoning as SKELETON_MIN_DISPLAY_MS (see
// useMinDisplayDuration.ts) — component tests assert on the closed/removed
// state via `findBy*`/`waitFor` (or need one extra tick even at 0ms, since
// the hook always defers the actual hide through a timeout callback), not
// a real animation-length wait.
export const POPOVER_EXIT_MS = process.env.NODE_ENV === "test" ? 0 : 120;

// Same idea, for HoldPanel's bottom-sheet slide — see its
// `onseol-sheet-leave` animation duration in apps/web/app/globals.css.
export const SHEET_EXIT_MS = process.env.NODE_ENV === "test" ? 0 : 150;

// For playing a leave animation before actually unmounting — NOT the same
// problem useMinDisplayDuration solves. That hook measures a minimum
// duration *since becoming active* (so a fast load doesn't flash a
// skeleton); this one always waits `exitMs` *since becoming inactive*,
// regardless of how long `active` was true beforehand — a menu open for
// 10 seconds and one open for 10ms both get the same close animation.
// Reusing useMinDisplayDuration for this would make `exitMs` count down
// from when it *opened*, so anything left open longer than `exitMs` (i.e.
// almost always) would close instantly with no animation at all — caught
// via a real-browser check, not something the (all under-test) unit/
// component tests could have caught since POPOVER_EXIT_MS is 0 there.
export function useAnimatedPresence(active: boolean, exitMs: number): boolean {
  const [shown, setShown] = useState(active);
  const [prevActive, setPrevActive] = useState(active);

  // "Adjusting state when a prop changes" (React's own sanctioned pattern,
  // done during render rather than in an effect) — flips `shown` true the
  // instant `active` does, with no extra render-after-mount delay.
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setShown(true);
  }

  useEffect(() => {
    // Nothing to hide (already hidden), or still active — including the
    // very first mount while inactive, which matters: without this guard,
    // that mount schedules a same-tick exit timer that can race the *next*
    // render (the one flipping `active` true) and win, since a macrotask
    // timer isn't guaranteed to lose to React's own effect-flush scheduling
    // — caught via a real-browser check, where this raced and incorrectly
    // hid the dialog right after it was supposed to open.
    if (active || !shown) return;

    // Deferred into the timeout callback rather than called here directly
    // — a setState synchronously inside an effect body trips
    // react-hooks/set-state-in-effect (see packages/ui's Toast.tsx for the
    // same async-boundary fix applied to a different case).
    const timer = window.setTimeout(() => setShown(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [active, exitMs, shown]);

  return shown;
}
