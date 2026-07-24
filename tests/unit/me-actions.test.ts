import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const hideOwnPraisePost = vi.hoisted(() => vi.fn());
const hideOwnPraiseComment = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/posts", () => ({ hideOwnPraisePost }));
vi.mock("@/server/comments", () => ({ hideOwnPraiseComment }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { hideMyComment, hideMyPost } from "@/app/me/actions";

describe("my activity actions", () => {
  beforeEach(() => {
    auth.mockReset();
    hideOwnPraisePost.mockReset();
    hideOwnPraiseComment.mockReset();
    revalidatePath.mockReset();
  });

  it("hides the current user's praise post and revalidates activity surfaces", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    hideOwnPraisePost.mockResolvedValue({ id: "post_1", status: "HIDDEN" });

    const formData = new FormData();
    formData.set("postId", "post_1");

    await hideMyPost(formData);

    expect(hideOwnPraisePost).toHaveBeenCalledWith("post_1", "user_1");
    expect(revalidatePath).toHaveBeenCalledWith("/me");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/posts/post_1");
  });

  it("hides the current user's praise comment and revalidates activity surfaces", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    hideOwnPraiseComment.mockResolvedValue({ id: "comment_1", postId: "post_1", visibilityState: "HIDDEN" });

    const formData = new FormData();
    formData.set("commentId", "comment_1");

    await hideMyComment(formData);

    expect(hideOwnPraiseComment).toHaveBeenCalledWith("comment_1", "user_1");
    expect(revalidatePath).toHaveBeenCalledWith("/me");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/posts/post_1");
  });

  it("rejects unauthenticated post hiding", async () => {
    auth.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("postId", "post_1");

    await expect(hideMyPost(formData)).rejects.toThrow("AUTH_REQUIRED");
    expect(hideOwnPraisePost).not.toHaveBeenCalled();
  });

  it("rejects missing comment ids", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });

    await expect(hideMyComment(new FormData())).rejects.toThrow("COMMENT_ID_REQUIRED");
    expect(hideOwnPraiseComment).not.toHaveBeenCalled();
  });
});
