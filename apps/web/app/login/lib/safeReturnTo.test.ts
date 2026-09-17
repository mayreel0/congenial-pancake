import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./safeReturnTo";

describe("safeReturnTo", () => {
  it("allows a same-origin relative path", () => {
    expect(safeReturnTo("/records")).toBe("/records");
    expect(safeReturnTo("/records?tab=replies")).toBe("/records?tab=replies");
  });

  it("falls back to /today when there is no param", () => {
    expect(safeReturnTo(null)).toBe("/today");
    expect(safeReturnTo("")).toBe("/today");
  });

  it("blocks a protocol-relative URL (//evil.com)", () => {
    expect(safeReturnTo("//evil.com")).toBe("/today");
  });

  it("blocks a backslash-prefixed URL some browsers treat as protocol-relative", () => {
    expect(safeReturnTo("/\\evil.com")).toBe("/today");
  });

  it("blocks a path that doesn't start with a slash", () => {
    expect(safeReturnTo("evil.com")).toBe("/today");
    expect(safeReturnTo("https://evil.com")).toBe("/today");
  });
});
