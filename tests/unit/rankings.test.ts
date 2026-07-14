import { describe, expect, it } from "vitest";
import { calculateWarmPraiserScore } from "@/server/rankings";

describe("ranking score", () => {
  it("rewards gratitude and penalizes reports", () => {
    const score = calculateWarmPraiserScore({
      gratitudeCount: 10,
      visibleCommentCount: 12,
      reportCount: 0,
      moderationPenalty: 0
    });

    expect(score).toBe(62);
  });

  it("does not reward raw volume alone", () => {
    const score = calculateWarmPraiserScore({
      gratitudeCount: 0,
      visibleCommentCount: 50,
      reportCount: 0,
      moderationPenalty: 0
    });

    expect(score).toBeLessThan(20);
  });

  it("never returns a negative score", () => {
    const score = calculateWarmPraiserScore({
      gratitudeCount: 0,
      visibleCommentCount: 1,
      reportCount: 10,
      moderationPenalty: 50
    });

    expect(score).toBe(0);
  });
});
