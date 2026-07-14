import { afterEach, describe, expect, it, vi } from "vitest";

const count = vi.hoisted(() => vi.fn());
const findFirst = vi.hoisted(() => vi.fn());

vi.mock("bullmq", () => ({
  Queue: class Queue {},
  Worker: class Worker {}
}));

vi.mock("server-only", () => ({}));

vi.mock("ioredis", () => ({
  default: class IORedis {}
}));

vi.mock("@/lib/db", () => ({
  db: { praiseComment: { count, findFirst } }
}));

vi.mock("@/server/ai", () => ({ generatePraiseComments: vi.fn() }));
vi.mock("@/server/realtime", () => ({ publishPostEvent: vi.fn() }));

import { ensureAiDisclosure, shouldRunInactivityPraise } from "@/server/jobs";

describe("inactivity praise policy", () => {
  afterEach(() => {
    vi.useRealTimers();
    count.mockReset();
    findFirst.mockReset();
  });

  it("skips a post that already has five AI comments", async () => {
    count.mockResolvedValueOnce(5);

    await expect(shouldRunInactivityPraise("post_1")).resolves.toBe(false);
    expect(count).toHaveBeenCalledOnce();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("runs when no human comments exist", async () => {
    count.mockResolvedValueOnce(2);
    findFirst.mockResolvedValueOnce(null);

    await expect(shouldRunInactivityPraise("post_1")).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: { postId: "post_1", isAiGenerated: false },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true }
    });
  });

  it("skips when the latest human comment is inside the quiet window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:30:00.000Z"));
    count.mockResolvedValueOnce(2);
    findFirst.mockResolvedValueOnce({ createdAt: new Date("2026-07-14T12:20:00.000Z") });

    await expect(shouldRunInactivityPraise("post_1")).resolves.toBe(false);
  });

  it("runs when the latest human comment is older than the quiet window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:31:00.000Z"));
    count.mockResolvedValueOnce(2);
    findFirst.mockResolvedValueOnce({ createdAt: new Date("2026-07-14T12:00:00.000Z") });

    await expect(shouldRunInactivityPraise("post_1")).resolves.toBe(true);
  });
});

describe("AI disclosure", () => {
  it("prefixes AI comments when the model omits disclosure", () => {
    expect(ensureAiDisclosure("잘 해냈어요")).toBe("AI 칭찬: 잘 해냈어요");
  });

  it("does not duplicate the AI disclosure prefix", () => {
    expect(ensureAiDisclosure("AI 칭찬: 잘 해냈어요")).toBe("AI 칭찬: 잘 해냈어요");
  });
});
