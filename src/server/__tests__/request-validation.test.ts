import { DisplayMode } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { parseComfortReplyInput, parseComfortRequestInput } from "@/server/request-validation";

describe("comfort request validation", () => {
  it("parses request input", () => {
    expect(parseComfortRequestInput({ body: "오늘 힘들었어요", displayMode: "ANONYMOUS" })).toEqual({
      body: "오늘 힘들었어요",
      displayMode: DisplayMode.ANONYMOUS
    });
  });

  it("rejects long reply input", () => {
    expect(() => parseComfortReplyInput({ body: "a".repeat(1001), displayMode: "NICKNAME" })).toThrow();
  });
});
