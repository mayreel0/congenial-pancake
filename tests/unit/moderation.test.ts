import { VisibilityState } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateSanctionState, moderateText } from "@/server/moderation";

describe("moderation", () => {
  it("holds praise disguised as mockery", () => {
    const result = moderateText("와 그걸 자랑이라고 올리다니 대단하다");
    expect(result.visibilityState).toBe(VisibilityState.AUTHOR_ONLY);
    expect(result.risk).toBeGreaterThanOrEqual(70);
  });

  it("allows warm praise", () => {
    const result = moderateText("끝까지 해낸 점이 정말 멋져요");
    expect(result.visibilityState).toBe(VisibilityState.VISIBLE);
  });

  it("maps trust score to sanctions", () => {
    expect(calculateSanctionState(100)).toBe("NORMAL");
    expect(calculateSanctionState(59)).toBe("LOW_TRUST");
    expect(calculateSanctionState(29)).toBe("SHADOW_BANNED");
    expect(calculateSanctionState(9)).toBe("SERVICE_BANNED");
  });
});
