import { DisplayMode, VisibilityState } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

const praiseCommentCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: { praiseComment: { create: praiseCommentCreate } }
}));

import { assertPostAuthor, createPraiseComment, normalizeCommentBody } from "@/server/comments";

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

  it("holds risky praise comments for the author", async () => {
    praiseCommentCreate.mockResolvedValue({ id: "comment_1" });

    await createPraiseComment("post_1", "user_1", {
      body: "와 그걸 자랑이라고 올리다니 대단하다",
      displayMode: DisplayMode.NICKNAME
    });

    expect(praiseCommentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        visibilityState: VisibilityState.AUTHOR_ONLY,
        moderationRisk: 75
      })
    });
  });
});
