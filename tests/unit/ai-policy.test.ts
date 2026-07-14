import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildPraisePrompt, clampPraiseCount, getAiProviderConfig } from "@/server/ai";

describe("AI praise policy", () => {
  it("clamps initial praise to one through three comments", () => {
    expect(clampPraiseCount(0)).toBe(1);
    expect(clampPraiseCount(2)).toBe(2);
    expect(clampPraiseCount(9)).toBe(3);
  });

  it("asks for specific effort-based praise and AI disclosure", () => {
    const prompt = buildPraisePrompt({
      title: "미루던 일을 끝냈어요",
      body: "병원 예약을 했습니다.",
      promptAnswers: { tone: "차분하게" }
    });

    expect(prompt).toContain("AI 칭찬");
    expect(prompt).toContain("노력");
    expect(prompt).toContain("병원 예약");
    expect(prompt).not.toContain(["전", "긍정"].join(""));
  });

  it("uses Gemini Flash-Lite as the default AI provider", () => {
    expect(getAiProviderConfig({ GEMINI_API_KEY: "gemini-key" })).toEqual({
      provider: "gemini",
      apiKey: "gemini-key",
      model: "gemini-2.5-flash-lite"
    });
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
