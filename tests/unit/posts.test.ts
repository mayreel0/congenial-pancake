import { DisplayMode } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/jobs", () => ({
  enqueueAiPraiseJob: vi.fn(),
  planAiCommentTimes: vi.fn(() => [new Date("2026-07-16T01:01:00.000Z")]),
  selectAiPraiseRequestCount: vi.fn(() => 1)
}));

import { normalizePageParam, normalizePostInput, normalizeSortParam } from "@/server/posts";

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

describe("post list query normalization", () => {
  it("normalizes invalid page values to the first page", () => {
    expect(normalizePageParam(undefined)).toBe(1);
    expect(normalizePageParam("0")).toBe(1);
    expect(normalizePageParam("abc")).toBe(1);
    expect(normalizePageParam("3")).toBe(3);
  });

  it("supports latest and oldest sort values", () => {
    expect(normalizeSortParam(undefined)).toBe("latest");
    expect(normalizeSortParam("oldest")).toBe("oldest");
    expect(normalizeSortParam("unknown")).toBe("latest");
  });
});
