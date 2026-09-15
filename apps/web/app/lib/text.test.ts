import { describe, expect, it } from "vitest";
import { clampNewlines } from "./text";

describe("clampNewlines", () => {
  it("returns the value unchanged when at or under the cap", () => {
    expect(clampNewlines("한 줄", 4)).toBe("한 줄");
    expect(clampNewlines("한\n두\n세\n네\n다섯", 4)).toBe("한\n두\n세\n네\n다섯");
  });

  it("truncates right after the last allowed newline", () => {
    expect(clampNewlines("한\n두\n세\n네\n다섯\n여섯", 4)).toBe(
      "한\n두\n세\n네\n다섯",
    );
  });

  it("drops everything typed after the cap is already hit, not just the extra newline", () => {
    expect(clampNewlines("한\n두\n세\n네\n다섯\n여섯째 줄 내용", 4)).toBe(
      "한\n두\n세\n네\n다섯",
    );
  });

  it("handles a value with no newlines at all", () => {
    expect(clampNewlines("줄바꿈 없음", 4)).toBe("줄바꿈 없음");
  });

  it("handles an empty string", () => {
    expect(clampNewlines("", 4)).toBe("");
  });
});
