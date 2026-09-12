import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiError } from "api";
import { toast, useToastState } from "ui/useToast";

describe("toast / useToastState", () => {
  it("starts with no toast", () => {
    const { result } = renderHook(() => useToastState());
    expect(result.current).toBeNull();
  });

  it("toast.success sets a success toast with the given message", () => {
    const { result } = renderHook(() => useToastState());
    act(() => toast.success("저장했어요"));
    expect(result.current).toEqual({
      kind: "success",
      message: "저장했어요",
    });
  });

  it("toast.warning sets a warning toast with the given message", () => {
    const { result } = renderHook(() => useToastState());
    act(() => toast.warning("확인이 필요해요"));
    expect(result.current).toEqual({
      kind: "warning",
      message: "확인이 필요해요",
    });
  });

  it("toast.error maps the error through the shared errorMessage() and sets kind 'error'", () => {
    const { result } = renderHook(() => useToastState());
    act(() =>
      toast.error(
        new ApiError(409, "REPORT_ALREADY_SUBMITTED", "You already reported this."),
      ),
    );
    expect(result.current).toEqual({
      kind: "error",
      message: "이미 신고한 항목이에요.",
    });
  });

  it("toast.dismiss clears the current toast", () => {
    const { result } = renderHook(() => useToastState());
    act(() => toast.success("저장했어요"));
    act(() => toast.dismiss());
    expect(result.current).toBeNull();
  });

  it("a toast set before a component subscribes is picked up on mount", () => {
    act(() => toast.success("이미 떠 있던 알림"));
    const { result } = renderHook(() => useToastState());
    expect(result.current).toEqual({
      kind: "success",
      message: "이미 떠 있던 알림",
    });
  });
});
