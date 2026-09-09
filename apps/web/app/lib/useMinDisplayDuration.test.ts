import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMinDisplayDuration } from "ui/useMinDisplayDuration";

describe("useMinDisplayDuration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays true for the minimum duration even after active turns false early", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useMinDisplayDuration(active, 500),
      { initialProps: { active: true } },
    );
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(100));
    rerender({ active: false });
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it("turns false immediately if active was already false longer than the minimum before this render", () => {
    const { result } = renderHook(() => useMinDisplayDuration(false, 500));
    expect(result.current).toBe(false);
  });

  it("does not cut a load short when it already runs longer than the minimum", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useMinDisplayDuration(active, 500),
      { initialProps: { active: true } },
    );

    act(() => vi.advanceTimersByTime(800));
    rerender({ active: false });
    // The hide is always deferred through a timeout (even a 0ms one, so a
    // setState is never called synchronously inside the effect) — advancing
    // by 0 flushes it.
    act(() => vi.advanceTimersByTime(0));
    expect(result.current).toBe(false);
  });
});
