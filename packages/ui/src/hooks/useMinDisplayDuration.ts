"use client";

import { useEffect, useRef, useState } from "react";

// Shared default so every skeleton across the app holds for the same
// perceptible length rather than each call site picking its own number. 0
// under test — component tests assert on post-load content via
// `findBy*`/`waitFor`, and a real 500ms wait per test would add real minutes
// across the whole suite for zero signal (the hook's own timing logic is
// unit-tested separately, with fake timers, using an explicit ms value).
export const SKELETON_MIN_DISPLAY_MS =
  process.env.NODE_ENV === "test" ? 0 : 500;

// A very fast response (common on a local/nearby network) makes a skeleton
// flash for a frame or two, which reads as a glitch rather than a loading
// state — this holds `true` for at least `minMs` after `active` first turns
// true, even if `active` itself flips back to `false` sooner. It never
// shortens a load that's genuinely slower than `minMs`.
export function useMinDisplayDuration(active: boolean, minMs: number): boolean {
  const [shown, setShown] = useState(active);
  const [prevActive, setPrevActive] = useState(active);
  const activatedAtRef = useRef<number | null>(null);

  // "Adjusting state when a prop changes" (React's own sanctioned pattern
  // for this, done during render rather than in an effect) — flips `shown`
  // true the instant `active` does, with no extra render-after-mount delay.
  // Only reads/writes state here, no Date.now(): a timestamp read has to
  // happen in the effect below, not render, since render must stay pure.
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setShown(true);
  }

  useEffect(() => {
    if (active) {
      activatedAtRef.current = Date.now();
      return;
    }

    const activatedAt = activatedAtRef.current;
    if (activatedAt === null) return;

    // Deferred into the timeout callback (even when remaining is 0) rather
    // than called here directly — a setState synchronously inside an effect
    // body trips react-hooks/set-state-in-effect (see packages/ui's Toast.tsx
    // for the same async-boundary fix applied to a different case).
    const remaining = Math.max(0, minMs - (Date.now() - activatedAt));
    const timer = window.setTimeout(() => setShown(false), remaining);
    return () => window.clearTimeout(timer);
  }, [active, minMs]);

  return shown;
}
