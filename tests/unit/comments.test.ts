import { DisplayMode, NotificationType, VisibilityState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const praiseCommentCreate = vi.hoisted(() => vi.fn());
const praiseCommentFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const praisePostFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const replyCreate = vi.hoisted(() => vi.fn());
const notificationCreate = vi.hoisted(() => vi.fn());
const scheduleInactivityPraise = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    praiseComment: { create: praiseCommentCreate, findUniqueOrThrow: praiseCommentFindUniqueOrThrow },
    praisePost: { findUniqueOrThrow: praisePostFindUniqueOrThrow },
    reply: { create: replyCreate },
    notification: { create: notificationCreate }
  }
}));

vi.mock("@/server/jobs", () => ({
  scheduleInactivityPraise
}));

import { addAuthorReply, assertPostAuthor, createPraiseComment, normalizeCommentBody } from "@/server/comments";

describe("comment rules", () => {
  beforeEach(() => {
    praiseCommentCreate.mockReset();
    praiseCommentFindUniqueOrThrow.mockReset();
    praisePostFindUniqueOrThrow.mockReset();
    replyCreate.mockReset();
    notificationCreate.mockReset();
    scheduleInactivityPraise.mockReset();
  });

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
    praisePostFindUniqueOrThrow.mockResolvedValue({ authorUserId: "user_2" });
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
    expect(scheduleInactivityPraise).toHaveBeenCalledWith("post_1");
  });

  it("notifies the post author when another user leaves a visible praise comment", async () => {
    praisePostFindUniqueOrThrow.mockResolvedValue({ authorUserId: "post_author" });
    praiseCommentCreate.mockResolvedValue({ id: "comment_1" });

    await createPraiseComment("post_1", "commenter", {
      body: "정말 잘하고 있어요.",
      displayMode: DisplayMode.NICKNAME
    });

    expect(notificationCreate).toHaveBeenCalledWith({
      data: {
        recipientUserId: "post_author",
        actorUserId: "commenter",
        type: NotificationType.COMMENT_ON_POST,
        postId: "post_1",
        commentId: "comment_1"
      }
    });
  });

  it("does not notify the post author about their own praise comment", async () => {
    praisePostFindUniqueOrThrow.mockResolvedValue({ authorUserId: "post_author" });
    praiseCommentCreate.mockResolvedValue({ id: "comment_1" });

    await createPraiseComment("post_1", "post_author", {
      body: "오늘의 나도 잘했다.",
      displayMode: DisplayMode.NICKNAME
    });

    expect(notificationCreate).not.toHaveBeenCalled();
  });

  it("notifies the comment author when the post author replies", async () => {
    praiseCommentFindUniqueOrThrow.mockResolvedValue({
      id: "comment_1",
      postId: "post_1",
      authorUserId: "commenter",
      post: { authorUserId: "post_author" }
    });
    replyCreate.mockResolvedValue({ id: "reply_1", postId: "post_1", commentId: "comment_1" });

    await addAuthorReply("comment_1", "post_author", "덕분에 힘이 났어요.");

    expect(notificationCreate).toHaveBeenCalledWith({
      data: {
        recipientUserId: "commenter",
        actorUserId: "post_author",
        type: NotificationType.REPLY_ON_COMMENT,
        postId: "post_1",
        commentId: "comment_1",
        replyId: "reply_1"
      }
    });
  });
});
