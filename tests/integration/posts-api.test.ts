import { SanctionState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const listFeedPostsMock = vi.fn();
const createPraisePostMock = vi.fn();
const findUniqueOrThrowMock = vi.fn();

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

vi.mock("@/server/posts", () => ({
  listFeedPosts: listFeedPostsMock,
  createPraisePost: createPraisePostMock
}));

describe("posts API route", () => {
  beforeEach(() => {
    vi.resetModules();
    authMock.mockReset();
    listFeedPostsMock.mockReset();
    createPraisePostMock.mockReset();
    findUniqueOrThrowMock.mockReset();
  });

  it("returns public feed posts", async () => {
    listFeedPostsMock.mockResolvedValue([{ id: "post_1", title: "해냈어요" }]);
    const { GET } = await import("@/app/api/posts/route");

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ posts: [{ id: "post_1", title: "해냈어요" }] });
    expect(listFeedPostsMock).toHaveBeenCalledOnce();
  });

  it("rejects unauthenticated post creation", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/posts/route");

    await expect(
      POST(new Request("http://localhost/api/posts", { method: "POST", body: "{}" }))
    ).rejects.toThrow("AUTH_REQUIRED");
    expect(createPraisePostMock).not.toHaveBeenCalled();
  });

  it("enforces write permission before creating a post", async () => {
    authMock.mockResolvedValue({ user: { id: "user_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "user_1", sanctionState: SanctionState.SERVICE_BANNED });
    const { POST } = await import("@/app/api/posts/route");

    await expect(
      POST(new Request("http://localhost/api/posts", { method: "POST", body: "{}" }))
    ).rejects.toThrow("WRITE_BLOCKED");
    expect(createPraisePostMock).not.toHaveBeenCalled();
  });


  it("returns 400 for known post validation errors", async () => {
    authMock.mockResolvedValue({ user: { id: "user_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "user_1", sanctionState: SanctionState.NORMAL });
    createPraisePostMock.mockRejectedValue(new Error("POST_BODY_REQUIRED"));
    const { POST } = await import("@/app/api/posts/route");

    const response = await POST(
      new Request("http://localhost/api/posts", {
        method: "POST",
        body: JSON.stringify({ title: "제목", body: "", displayMode: "NICKNAME", promptAnswers: null })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "POST_BODY_REQUIRED" });
  });

  it("delegates valid post creation to the post service", async () => {
    const input = { title: "오늘 해냈어요", body: "끝냈습니다", displayMode: "ANONYMOUS", promptAnswers: null };
    const created = { id: "post_1", ...input };
    authMock.mockResolvedValue({ user: { id: "user_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "user_1", sanctionState: SanctionState.NORMAL });
    createPraisePostMock.mockResolvedValue(created);
    const { POST } = await import("@/app/api/posts/route");

    const response = await POST(
      new Request("http://localhost/api/posts", {
        method: "POST",
        body: JSON.stringify(input)
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ post: created });
    expect(createPraisePostMock).toHaveBeenCalledWith(input, "user_1");
  });
});
