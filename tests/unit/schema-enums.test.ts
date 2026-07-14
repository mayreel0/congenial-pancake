import { DisplayMode, SanctionState, VisibilityState } from "@prisma/client";
import { describe, expect, it } from "vitest";

describe("schema enum contract", () => {
  it("keeps display modes explicit", () => {
    expect(Object.values(DisplayMode)).toEqual(["NICKNAME", "ANONYMOUS"]);
  });

  it("supports quiet moderation visibility states", () => {
    expect(Object.values(VisibilityState)).toContain("AUTHOR_ONLY");
  });

  it("supports trust-based sanctions", () => {
    expect(Object.values(SanctionState)).toContain("SHADOW_BANNED");
  });
});
