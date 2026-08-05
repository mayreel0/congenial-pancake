import { QualityLabel, VisibilityState } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { evaluateContentQuality, qualityDecisionToVisibility } from "@/server/content-quality";

describe("evaluateContentQuality", () => {
  it("allows concrete comfort text", () => {
    const decision = evaluateContentQuality({
      targetType: "COMFORT_REQUEST",
      text: "오늘 회사에서 실수해서 마음이 오래 가라앉았어요. 그냥 괜찮다고 듣고 싶어요."
    });

    expect(decision.label).toBe(QualityLabel.ALLOWED);
    expect(decision.score).toBe(0);
    expect(qualityDecisionToVisibility(decision)).toBe(VisibilityState.VISIBLE);
  });

  it("marks repeated meaningless text as low effort", () => {
    const decision = evaluateContentQuality({
      targetType: "COMFORT_REPLY",
      text: "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
    });

    expect(decision.label).toBe(QualityLabel.LOW_EFFORT);
    expect(qualityDecisionToVisibility(decision)).toBe(VisibilityState.AUTHOR_ONLY);
  });

  it("holds backhanded comfort without relying on profanity", () => {
    const decision = evaluateContentQuality({
      targetType: "COMFORT_REPLY",
      text: "그 정도로 힘들면 사회생활은 어떻게 하시려고요"
    });

    expect(decision.label).toBe(QualityLabel.DISMISSIVE);
    expect(qualityDecisionToVisibility(decision)).toBe(VisibilityState.HELD);
  });

  it("hides unsafe violent text", () => {
    const decision = evaluateContentQuality({
      targetType: "COMFORT_REPLY",
      text: "그 사람 그냥 죽여버려"
    });

    expect(decision.label).toBe(QualityLabel.UNSAFE);
    expect(qualityDecisionToVisibility(decision)).toBe(VisibilityState.HIDDEN);
  });
});
