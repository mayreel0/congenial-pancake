import { describe, expect, it } from "vitest";

import { POST as commentPost } from "@/app/api/posts/[postId]/comments/route";
import { POST as commentReactionPost } from "@/app/api/comments/[commentId]/reactions/route";
import { POST as commentReplyPost } from "@/app/api/comments/[commentId]/replies/route";
import { GET as postsGet, POST as postsPost } from "@/app/api/posts/route";
import { GET as rankingsGet } from "@/app/api/rankings/route";

async function json(response: Response) {
  return response.json() as Promise<{ error: string }>;
}

describe("legacy praise APIs", () => {
  it("returns 410 for removed post and ranking routes", async () => {
    await expect(json(await postsGet())).resolves.toEqual({ error: "POSTS_REMOVED_FOR_COMFORT_PIVOT" });
    await expect(json(await postsPost())).resolves.toEqual({ error: "POSTS_REMOVED_FOR_COMFORT_PIVOT" });
    await expect(json(await rankingsGet())).resolves.toEqual({ error: "RANKINGS_REMOVED_FOR_COMFORT_PIVOT" });
  });

  it("returns 410 for removed comment action routes", async () => {
    await expect(json(await commentPost())).resolves.toEqual({ error: "COMMENTS_REMOVED_FOR_COMFORT_PIVOT" });
    await expect(json(await commentReplyPost())).resolves.toEqual({ error: "COMMENTS_REMOVED_FOR_COMFORT_PIVOT" });
    await expect(json(await commentReactionPost())).resolves.toEqual({ error: "COMMENTS_REMOVED_FOR_COMFORT_PIVOT" });
  });
});
