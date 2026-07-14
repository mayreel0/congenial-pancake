import { describe, expect, it, vi } from "vitest";
import { publishPostEvent, registerSocketServer } from "@/server/realtime";

describe("realtime publishing", () => {
  it("publishes post events to the post-specific room", () => {
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));

    registerSocketServer({ to });
    publishPostEvent("post_1", { type: "comment.created", postId: "post_1", commentId: "comment_1" });

    expect(to).toHaveBeenCalledWith("post:post_1");
    expect(emit).toHaveBeenCalledWith("post:event", {
      type: "comment.created",
      postId: "post_1",
      commentId: "comment_1"
    });
  });
});
