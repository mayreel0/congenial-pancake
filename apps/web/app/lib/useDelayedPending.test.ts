import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDelayedPending } from "ui/useDelayedPending";

describe("useDelayedPending", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays false while pending hasn't lasted past the delay yet", () => {
    const { result } = renderHook(() => useDelayedPending(true, 200));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(199));
    expect(result.current).toBe(false);
  });

  it("turns true once pending has lasted past the delay", () => {
    const { result } = renderHook(() => useDelayedPending(true, 200));

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(true);
  });

  it("never turns true if pending ends before the delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ pending }) => useDelayedPending(pending, 200),
      { initialProps: { pending: true } },
    );

    act(() => vi.advanceTimersByTime(100));
    rerender({ pending: false });
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(false);
  });

  it("hides instantly (no delay) once pending ends after already showing", () => {
    const { result, rerender } = renderHook(
      ({ pending }) => useDelayedPending(pending, 200),
      { initialProps: { pending: true } },
    );

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(true);

    rerender({ pending: false });
    expect(result.current).toBe(false);
  });

  it("delays again on a second round of pending after a completed one", () => {
    const { result, rerender } = renderHook(
      ({ pending }) => useDelayedPending(pending, 200),
      { initialProps: { pending: true } },
    );

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(true);

    rerender({ pending: false });
    rerender({ pending: true });
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(true);
  });
});
