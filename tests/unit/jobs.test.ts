import { afterEach, describe, expect, it, vi } from "vitest";

const count = vi.hoisted(() => vi.fn());
const findFirst = vi.hoisted(() => vi.fn());
const aiJobFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const aiJobUpdate = vi.hoisted(() => vi.fn());
const canRunAiPraiseJob = vi.hoisted(() => vi.fn());
const recordAiUsageEvent = vi.hoisted(() => vi.fn());
const generatePraiseComments = vi.hoisted(() => vi.fn());
const publishPostEvent = vi.hoisted(() => vi.fn());

vi.mock("bullmq", () => ({
  Queue: class Queue {},
  Worker: class Worker {}
}));

vi.mock("server-only", () => ({}));

vi.mock("ioredis", () => ({
  default: class IORedis {}
}));

vi.mock("@/lib/db", () => ({
  db: {
    aiPraiseJob: {
      findUniqueOrThrow: aiJobFindUniqueOrThrow,
      update: aiJobUpdate
    },
    praiseComment: { count, findFirst }
  }
}));

vi.mock("@/server/ai", () => ({
  buildPraisePrompt: vi.fn(() => "prompt text"),
  generatePraiseComments,
  getAiProviderConfig: vi.fn(() => ({ provider: "gemini", model: "gemini-2.5-flash-lite", apiKey: "key" }))
}));
vi.mock("@/server/ai-controls", () => ({ canRunAiPraiseJob, recordAiUsageEvent }));
vi.mock("@/server/realtime", () => ({ publishPostEvent }));

import { ensureAiDisclosure, processAiPraiseJob, shouldRunInactivityPraise } from "@/server/jobs";

describe("inactivity praise policy", () => {
  afterEach(() => {
    vi.useRealTimers();
    count.mockReset();
    findFirst.mockReset();
    aiJobFindUniqueOrThrow.mockReset();
    aiJobUpdate.mockReset();
    canRunAiPraiseJob.mockReset();
    recordAiUsageEvent.mockReset();
    generatePraiseComments.mockReset();
    publishPostEvent.mockReset();
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

describe("AI praise worker controls", () => {
  afterEach(() => {
    aiJobFindUniqueOrThrow.mockReset();
    aiJobUpdate.mockReset();
    canRunAiPraiseJob.mockReset();
    recordAiUsageEvent.mockReset();
    generatePraiseComments.mockReset();
    publishPostEvent.mockReset();
  });

  it("skips disabled AI before provider generation", async () => {
    const aiJob = {
      id: "job_1",
      postId: "post_1",
      jobType: "INITIAL_PRAISE",
      status: "PENDING",
      resultCommentIds: [],
      post: { title: "해냈어요", body: "끝냈어요", promptAnswers: null }
    };
    aiJobFindUniqueOrThrow.mockResolvedValueOnce(aiJob);
    aiJobUpdate.mockResolvedValueOnce({ ...aiJob, status: "RUNNING" }).mockResolvedValueOnce({ ...aiJob, status: "SKIPPED" });
    canRunAiPraiseJob.mockResolvedValueOnce({ allowed: false, reason: "disabled" });

    await processAiPraiseJob("job_1");

    expect(generatePraiseComments).not.toHaveBeenCalled();
    expect(aiJobUpdate).toHaveBeenLastCalledWith({ where: { id: "job_1" }, data: { status: "SKIPPED" } });
    expect(recordAiUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job_1",
        postId: "post_1",
        status: "SKIPPED",
        reason: "disabled",
        requestedComments: 3,
        generatedComments: 0
      })
    );
    expect(publishPostEvent).not.toHaveBeenCalled();
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
