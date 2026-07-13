import { describe, expect, it } from "vitest";
import { assertPostAuthor, normalizeCommentBody } from "@/server/comments";

describe("comment rules", () => {
  it("normalizes comment body", () => {
    expect(normalizeCommentBody("  정말 멋져요.  ")).toBe("정말 멋져요.");
  });

  it("rejects empty comment body", () => {
    expect(() => normalizeCommentBody(" ")).toThrow("COMMENT_BODY_REQUIRED");
  });

  it("allows only the post author to react or reply", () => {
    expect(() => assertPostAuthor("user_1", "user_1")).not.toThrow();
    expect(() => assertPostAuthor("user_1", "user_2")).toThrow("POST_AUTHOR_ONLY");
  });
});
