import { describe, expect, it, vi } from "vitest";

const count = vi.hoisted(() => vi.fn());

vi.mock("bullmq", () => ({
  Queue: class Queue {},
  Worker: class Worker {}
}));

vi.mock("server-only", () => ({}));

vi.mock("ioredis", () => ({
  default: class IORedis {}
}));

vi.mock("@/lib/db", () => ({
  db: { praiseComment: { count } }
}));

vi.mock("@/server/ai", () => ({ generatePraiseComments: vi.fn() }));
vi.mock("@/server/realtime", () => ({ publishPostEvent: vi.fn() }));

import { shouldRunInactivityPraise } from "@/server/jobs";

describe("inactivity praise policy", () => {
  it("skips a post that already has five AI comments", async () => {
    count.mockResolvedValueOnce(5);

    await expect(shouldRunInactivityPraise("post_1")).resolves.toBe(false);
    expect(count).toHaveBeenCalledOnce();
  });

  it("runs only when no visible human comments exist", async () => {
    count.mockResolvedValueOnce(2).mockResolvedValueOnce(0);

    await expect(shouldRunInactivityPraise("post_1")).resolves.toBe(true);
    expect(count).toHaveBeenLastCalledWith({
      where: { postId: "post_1", isAiGenerated: false, visibilityState: "VISIBLE" }
    });
  });
});
