import { SanctionState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findUniqueOrThrowMock = vi.fn();
const createPraiseCommentMock = vi.fn();
const addAuthorReplyMock = vi.fn();
const addAuthorReactionMock = vi.fn();
const publishPostEventMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUniqueOrThrow: findUniqueOrThrowMock
    }
  }
}));

vi.mock("@/server/comments", () => ({
  createPraiseComment: createPraiseCommentMock,
  addAuthorReply: addAuthorReplyMock,
  addAuthorReaction: addAuthorReactionMock
}));

vi.mock("@/server/realtime", () => ({
  publishPostEvent: publishPostEventMock
}));

describe("comment action API validation", () => {
  beforeEach(() => {
    vi.resetModules();
    authMock.mockReset();
    findUniqueOrThrowMock.mockReset();
    createPraiseCommentMock.mockReset();
    addAuthorReplyMock.mockReset();
    addAuthorReactionMock.mockReset();
    publishPostEventMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "user_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "user_1", sanctionState: SanctionState.NORMAL });
  });

  it("returns 400 for malformed praise comment input", async () => {
    const { POST } = await import("@/app/api/posts/[postId]/comments/route");

    const response = await POST(
      new Request("http://localhost/api/posts/post_1/comments", {
        method: "POST",
        body: JSON.stringify({ displayMode: "NICKNAME" })
      }),
      { params: Promise.resolve({ postId: "post_1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "INVALID_COMMENT_INPUT" });
    expect(createPraiseCommentMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed author reply input", async () => {
    const { POST } = await import("@/app/api/comments/[commentId]/replies/route");

    const response = await POST(
      new Request("http://localhost/api/comments/comment_1/replies", {
        method: "POST",
        body: JSON.stringify({ body: 123 })
      }),
      { params: Promise.resolve({ commentId: "comment_1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "INVALID_COMMENT_INPUT" });
    expect(addAuthorReplyMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed reaction input", async () => {
    const { POST } = await import("@/app/api/comments/[commentId]/reactions/route");

    const response = await POST(
      new Request("http://localhost/api/comments/comment_1/reactions", {
        method: "POST",
        body: JSON.stringify({ type: "NOPE" })
      }),
      { params: Promise.resolve({ commentId: "comment_1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "INVALID_REACTION_TYPE" });
    expect(addAuthorReactionMock).not.toHaveBeenCalled();
  });
});
