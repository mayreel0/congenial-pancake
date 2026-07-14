import { DisplayMode } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/jobs", () => ({
  enqueueAiPraiseJob: vi.fn()
}));

import { normalizePostInput } from "@/server/posts";

describe("post input normalization", () => {
  it("trims title and body and preserves prompt answers", () => {
    const input = normalizePostInput({
      title: "  오늘 해냈어요  ",
      body: "  미뤄둔 일을 끝냈습니다.  ",
      displayMode: DisplayMode.ANONYMOUS,
      promptAnswers: { tone: "다정하게" }
    });

    expect(input.title).toBe("오늘 해냈어요");
    expect(input.body).toBe("미뤄둔 일을 끝냈습니다.");
    expect(input.displayMode).toBe(DisplayMode.ANONYMOUS);
    expect(input.promptAnswers).toEqual({ tone: "다정하게" });
  });


  it("drops empty optional prompt answers", () => {
    const input = normalizePostInput({
      title: "오늘 해냈어요",
      body: "끝냈습니다",
      displayMode: DisplayMode.NICKNAME,
      promptAnswers: { accomplished: "  ", praisePoint: "꾸준함", tone: "" }
    });

    expect(input.promptAnswers).toEqual({ praisePoint: "꾸준함" });
  });

  it("normalizes optional prompt answers to null when all are empty", () => {
    const input = normalizePostInput({
      title: "오늘 해냈어요",
      body: "끝냈습니다",
      displayMode: DisplayMode.NICKNAME,
      promptAnswers: { accomplished: "", praisePoint: "   " }
    });

    expect(input.promptAnswers).toBeNull();
  });

  it("maps unknown post validation failures to a stable input error", () => {
    expect(() =>
      normalizePostInput({
        title: "x".repeat(121),
        body: "본문",
        displayMode: DisplayMode.NICKNAME,
        promptAnswers: null
      })
    ).toThrow("INVALID_POST_INPUT");
  });

  it("rejects empty post bodies", () => {
    expect(() =>
      normalizePostInput({
        title: "제목",
        body: " ",
        displayMode: DisplayMode.NICKNAME,
        promptAnswers: null
      })
    ).toThrow("POST_BODY_REQUIRED");
  });
});
