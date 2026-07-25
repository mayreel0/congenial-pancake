import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildPraisePrompt,
  clampPraiseCount,
  classifyAiPraiseInputSafety,
  getAiProviderConfig,
  getAiProviderErrorReason,
  validateGeneratedPraiseComments
} from "@/server/ai";
import { planAiCommentTimes, selectAiPraiseRequestCount } from "@/server/jobs";

describe("AI praise policy", () => {
  it("clamps initial praise to one through three comments", () => {
    expect(clampPraiseCount(0)).toBe(1);
    expect(clampPraiseCount(2)).toBe(2);
    expect(clampPraiseCount(9)).toBe(3);
  });

  it("asks for specific effort-based praise without AI disclosure language", () => {
    const prompt = buildPraisePrompt({
      title: "미루던 일을 끝냈어요",
      body: "병원 예약을 했습니다.",
      promptAnswers: { tone: "차분하게" }
    });

    expect(prompt).not.toContain("AI");
    expect(prompt).not.toContain("인공지능");
    expect(prompt).toContain("노력");
    expect(prompt).toContain("병원 예약");
    expect(prompt).not.toContain(["전", "긍정"].join(""));
  });

  it("varies initial AI praise requests from one to three comments", () => {
    expect(selectAiPraiseRequestCount("INITIAL_PRAISE", () => 0)).toBe(1);
    expect(selectAiPraiseRequestCount("INITIAL_PRAISE", () => 0.5)).toBe(2);
    expect(selectAiPraiseRequestCount("INITIAL_PRAISE", () => 0.99)).toBe(3);
    expect(selectAiPraiseRequestCount("INACTIVITY_PRAISE", () => 0.99)).toBe(1);
  });

  it("spreads generated comment timestamps apart", () => {
    const base = new Date("2026-07-16T01:00:00.000Z");
    const times = planAiCommentTimes(3, base, () => 0);

    expect(times).toHaveLength(3);
    expect(times[0].getTime()).toBeGreaterThanOrEqual(base.getTime());
    expect(times[1].getTime() - times[0].getTime()).toBeGreaterThanOrEqual(3 * 60 * 1000);
    expect(times[2].getTime() - times[1].getTime()).toBeGreaterThanOrEqual(3 * 60 * 1000);
  });

  it("uses Gemini Flash-Lite as the default AI provider", () => {
    expect(getAiProviderConfig({ GEMINI_API_KEY: "gemini-key" })).toEqual({
      provider: "gemini",
      apiKey: "gemini-key",
      model: "gemini-3.1-flash-lite"
    });
  });

  it("classifies unavailable provider models for moderation logs", () => {
    expect(
      getAiProviderErrorReason(
        new Error(
          '{"error":{"code":404,"message":"This model models/gemini-2.5-flash-lite is no longer available to new users.","status":"NOT_FOUND"}}'
        )
      )
    ).toBe("provider_error:model_not_found");
  });

  it("classifies conservative Korean and English crisis input before generation", () => {
    expect(
      classifyAiPraiseInputSafety({
        title: "오늘 너무 힘들어요",
        body: "I want to kill myself and disappear.",
        promptAnswers: { detail: "그만 살고 싶다는 생각이 들어요" }
      })
    ).toEqual({ safe: false, reason: "safety:crisis_input_detected" });
  });

  it("allows ordinary praise requests through input safety classification", () => {
    expect(
      classifyAiPraiseInputSafety({
        title: "발표를 마쳤어요",
        body: "긴장했지만 끝까지 해냈습니다.",
        promptAnswers: { tone: "따뜻하게" }
      })
    ).toEqual({ safe: true });
  });

  it("keeps warm Korean praise under 120 chars and removes invalid provider outputs", () => {
    expect(
      validateGeneratedPraiseComments([
        "끝까지 해낸 집중력이 정말 멋져요.",
        "AI 칭찬: 정말 잘했어요.",
        "병원에 꼭 가서 치료받으세요.",
        "끝까지 해낸 집중력이 정말 멋져요.",
        "몸매가 좋아 보여서 대단해요.",
        "a".repeat(121)
      ])
    ).toEqual(["끝까지 해낸 집중력이 정말 멋져요."]);
  });

  it("rejects advice, AI disclosure, crisis, and empty output as unusable", () => {
    expect(
      validateGeneratedPraiseComments(["", "제가 상담사라면 조언을 드릴게요.", "죽고 싶다는 마음을 이해해요.", "As an AI, great job."])
    ).toEqual([]);
  });

  it("classifies common provider failures with stable reason strings", () => {
    expect(getAiProviderErrorReason(new Error("401 unauthorized invalid api key"))).toBe("provider_error:auth_failed");
    expect(getAiProviderErrorReason(new Error("deadline exceeded timeout"))).toBe("provider_error:timeout");
    expect(getAiProviderErrorReason(new Error("blocked by safety filter"))).toBe("provider_error:safety_blocked");
    expect(getAiProviderErrorReason(new Error("empty malformed response"))).toBe("provider_error:empty_or_malformed_response");
    expect(getAiProviderErrorReason(new Error("service unavailable"))).toBe("provider_error:generic");
  });

  it("can switch praise generation to OpenAI with environment variables", () => {
    expect(
      getAiProviderConfig({
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "openai-key",
        OPENAI_MODEL: "gpt-4o-mini"
      })
    ).toEqual({
      provider: "openai",
      apiKey: "openai-key",
      model: "gpt-4o-mini"
    });
  });
});
