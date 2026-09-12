import { describe, expect, it } from "vitest";
import { ApiError, errorMessage } from "api";

describe("errorMessage", () => {
  it("passes through the raw message for dynamic-content codes", () => {
    const cooldown = new ApiError(
      429,
      "AUTH_NICKNAME_COOLDOWN",
      "닉네임 변경 쿨타임이 아직 남아있어요. 3일 후에 다시 시도해주세요.",
    );
    expect(errorMessage(cooldown)).toBe(
      "닉네임 변경 쿨타임이 아직 남아있어요. 3일 후에 다시 시도해주세요.",
    );

    const guestLimit = new ApiError(
      409,
      "REPLY_GUEST_LIMIT_EXCEEDED",
      "비회원은 답변을 최대 5번까지만 남길 수 있어요. 로그인하면 더 남길 수 있어요.",
    );
    expect(errorMessage(guestLimit)).toBe(
      "비회원은 답변을 최대 5번까지만 남길 수 있어요. 로그인하면 더 남길 수 있어요.",
    );
  });

  it("looks up a fixed Korean translation for a mapped code, ignoring the raw backend message", () => {
    const error = new ApiError(
      409,
      "REPORT_ALREADY_SUBMITTED",
      "You already reported this.",
    );
    expect(errorMessage(error)).toBe("이미 신고한 항목이에요.");
  });

  it("falls back to the generic message for an unmapped ApiError code", () => {
    const error = new ApiError(500, "SOME_UNKNOWN_CODE", "boom");
    expect(errorMessage(error)).toBe(
      "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.",
    );
  });

  it("falls back to the generic message for a non-ApiError value", () => {
    expect(errorMessage(new Error("network down"))).toBe(
      "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.",
    );
    expect(errorMessage("plain string")).toBe(
      "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.",
    );
  });
});
