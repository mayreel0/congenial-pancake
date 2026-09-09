import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiError } from "api";
import { useToast } from "ui/useToast";

describe("useToast", () => {
  it("starts with no toast", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toast).toBeNull();
  });

  it("showSuccess sets a success toast with the given message", () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.showSuccess("저장했어요"));
    expect(result.current.toast).toEqual({
      kind: "success",
      message: "저장했어요",
    });
  });

  it("showWarning sets a warning toast with the given message", () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.showWarning("확인이 필요해요"));
    expect(result.current.toast).toEqual({
      kind: "warning",
      message: "확인이 필요해요",
    });
  });

  it("showError maps the error through the shared errorMessage() and sets kind 'error'", () => {
    const { result } = renderHook(() => useToast());
    act(() =>
      result.current.showError(
        new ApiError(409, "REPORT_ALREADY_SUBMITTED", "You already reported this."),
      ),
    );
    expect(result.current.toast).toEqual({
      kind: "error",
      message: "이미 신고한 항목이에요.",
    });
  });

  it("dismiss clears the current toast", () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.showSuccess("저장했어요"));
    act(() => result.current.dismiss());
    expect(result.current.toast).toBeNull();
  });
});
