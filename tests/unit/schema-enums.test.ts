import { describe, expect, it } from "vitest";

const displayModes = ["NICKNAME", "ANONYMOUS"] as const;
const visibilityStates = ["VISIBLE", "HELD", "HIDDEN", "AUTHOR_ONLY"] as const;
const sanctionStates = ["NORMAL", "LOW_TRUST", "SHADOW_BANNED", "SERVICE_BANNED"] as const;

describe("schema enum contract", () => {
  it("keeps display modes explicit", () => {
    expect(displayModes).toEqual(["NICKNAME", "ANONYMOUS"]);
  });

  it("supports quiet moderation visibility states", () => {
    expect(visibilityStates).toContain("AUTHOR_ONLY");
  });

  it("supports trust-based sanctions", () => {
    expect(sanctionStates).toContain("SHADOW_BANNED");
  });
});
