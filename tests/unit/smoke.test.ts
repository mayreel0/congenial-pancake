import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs TypeScript tests", () => {
    expect("전긍정").toContain("긍정");
  });
});
