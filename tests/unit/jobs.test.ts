import { afterEach, describe, expect, it, vi } from "vitest";

const count = vi.hoisted(() => vi.fn());
const findFirst = vi.hoisted(() => vi.fn());
const aiJobFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const aiJobUpdate = vi.hoisted(() => vi.fn());
const canRunAiPraiseJob = vi.hoisted(() => vi.fn());
const recordAiUsageEvent = vi.hoisted(() => vi.fn());
const generatePraiseComments = vi.hoisted(() => vi.fn());
const publishPostEvent = vi.hoisted(() => vi.fn());
const recomputeRankingSnapshots = vi.hoisted(() => vi.fn());
const workerInstances = vi.hoisted(() => [] as Array<{ name: string; processor: (job: { data: unknown }) => Promise<void> }>);

vi.mock("bullmq", () => ({
  Queue: class Queue {},
  Worker: class Worker {
    constructor(name: string, processor: (job: { data: unknown }) => Promise<void>) {
      workerInstances.push({ name, processor });
    }
  }
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
  classifyAiPraiseInputSafety: vi.fn(() => ({ safe: true })),
  generatePraiseComments,
  getAiProviderConfig: vi.fn(() => ({ provider: "gemini", model: "gemini-3.1-flash-lite", apiKey: "key" })),
  getAiProviderErrorReason: vi.fn(() => "provider_error:model_not_found"),
  validateGeneratedPraiseComments: vi.fn((comments: string[]) => comments)
}));
vi.mock("@/server/ai-controls", () => ({ canRunAiPraiseJob, recordAiUsageEvent }));
vi.mock("@/server/realtime", () => ({ publishPostEvent }));
vi.mock("@/server/rankings", () => ({ recomputeRankingSnapshots }));

import { classifyAiPraiseInputSafety, validateGeneratedPraiseComments } from "@/server/ai";
import { ensureNaturalAiComment, processAiPraiseJob, shouldRunInactivityPraise, startRankingWorker } from "@/server/jobs";

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
    vi.mocked(classifyAiPraiseInputSafety).mockReset();
    vi.mocked(classifyAiPraiseInputSafety).mockReturnValue({ safe: true });
    vi.mocked(validateGeneratedPraiseComments).mockReset();
    vi.mocked(validateGeneratedPraiseComments).mockImplementation((comments: string[]) => comments);
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

describe("ranking worker", () => {
  afterEach(() => {
    recomputeRankingSnapshots.mockReset();
    workerInstances.length = 0;
  });

  it("recomputes ranking snapshots when ranking jobs run", async () => {
    startRankingWorker();
    await workerInstances[0].processor({ data: {} });

    expect(workerInstances[0].name).toBe("ranking");
    expect(recomputeRankingSnapshots).toHaveBeenCalledOnce();
  });
});

describe("AI praise worker controls", () => {
  afterEach(() => {
    aiJobFindUniqueOrThrow.mockReset();
    aiJobUpdate.mockReset();
    canRunAiPraiseJob.mockReset();
    recordAiUsageEvent.mockReset();
    generatePraiseComments.mockReset();
    vi.mocked(classifyAiPraiseInputSafety).mockReset();
    vi.mocked(classifyAiPraiseInputSafety).mockReturnValue({ safe: true });
    vi.mocked(validateGeneratedPraiseComments).mockReset();
    vi.mocked(validateGeneratedPraiseComments).mockImplementation((comments: string[]) => comments);
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
        requestedComments: 1,
        generatedComments: 0
      })
    );
    expect(publishPostEvent).not.toHaveBeenCalled();
  });

  it("records classified provider errors when generation fails", async () => {
    const aiJob = {
      id: "job_1",
      postId: "post_1",
      jobType: "INITIAL_PRAISE",
      status: "PENDING",
      resultCommentIds: [],
      post: { title: "해냈어요", body: "끝냈어요", promptAnswers: null }
    };
    aiJobFindUniqueOrThrow.mockResolvedValueOnce(aiJob);
    aiJobUpdate.mockResolvedValueOnce({ ...aiJob, status: "RUNNING" }).mockResolvedValueOnce({ ...aiJob, status: "FAILED" });
    canRunAiPraiseJob.mockResolvedValueOnce({ allowed: true, reason: "allowed" });
    generatePraiseComments.mockRejectedValueOnce(new Error("model not found"));

    await expect(processAiPraiseJob("job_1")).rejects.toThrow("model not found");

    expect(recordAiUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job_1",
        postId: "post_1",
        status: "FAILED",
        reason: "provider_error:model_not_found",
        requestedComments: 1,
        generatedComments: 0
      })
    );
  });

  it("skips crisis input before provider generation", async () => {
    const aiJob = {
      id: "job_1",
      postId: "post_1",
      jobType: "INITIAL_PRAISE",
      status: "PENDING",
      resultCommentIds: [],
      post: { title: "살기 싫어요", body: "그만 살고 싶어요", promptAnswers: { feeling: "끝내고 싶다" } }
    };
    aiJobFindUniqueOrThrow.mockResolvedValueOnce(aiJob);
    aiJobUpdate.mockResolvedValueOnce({ ...aiJob, status: "RUNNING" }).mockResolvedValueOnce({ ...aiJob, status: "SKIPPED" });
    vi.mocked(classifyAiPraiseInputSafety).mockReturnValueOnce({ safe: false, reason: "safety:crisis_input_detected" });

    await processAiPraiseJob("job_1");

    expect(canRunAiPraiseJob).not.toHaveBeenCalled();
    expect(generatePraiseComments).not.toHaveBeenCalled();
    expect(aiJobUpdate).toHaveBeenLastCalledWith({ where: { id: "job_1" }, data: { status: "SKIPPED" } });
    expect(recordAiUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job_1",
        postId: "post_1",
        status: "SKIPPED",
        reason: "safety:crisis_input_detected",
        requestedComments: 1,
        generatedComments: 0,
        responseTexts: []
      })
    );
  });

  it("fails without creating comments when provider output has no usable praise", async () => {
    const aiJob = {
      id: "job_1",
      postId: "post_1",
      jobType: "INITIAL_PRAISE",
      status: "PENDING",
      resultCommentIds: [],
      post: { title: "해냈어요", body: "끝냈어요", promptAnswers: null }
    };
    aiJobFindUniqueOrThrow.mockResolvedValueOnce(aiJob);
    aiJobUpdate.mockResolvedValueOnce({ ...aiJob, status: "RUNNING" }).mockResolvedValueOnce({ ...aiJob, status: "FAILED" });
    canRunAiPraiseJob.mockResolvedValueOnce({ allowed: true, reason: "allowed" });
    generatePraiseComments.mockResolvedValueOnce(["AI 칭찬: 잘했어요", "병원에 가서 치료받으세요"]);
    vi.mocked(validateGeneratedPraiseComments).mockReturnValueOnce([]);

    await processAiPraiseJob("job_1");

    expect(validateGeneratedPraiseComments).toHaveBeenCalledWith(["AI 칭찬: 잘했어요", "병원에 가서 치료받으세요"]);
    expect(aiJobUpdate).toHaveBeenLastCalledWith({ where: { id: "job_1" }, data: { status: "FAILED" } });
    expect(recordAiUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job_1",
        postId: "post_1",
        status: "FAILED",
        reason: "quality:no_usable_output",
        requestedComments: 1,
        generatedComments: 0,
        responseTexts: []
      })
    );
    expect(publishPostEvent).not.toHaveBeenCalled();
  });
});

describe("AI comment naturalization", () => {
  it("removes AI disclosure prefixes from generated comments", () => {
    expect(ensureNaturalAiComment("AI 칭찬: 잘 해냈어요")).toBe("잘 해냈어요");
  });

  it("trims natural comments without adding disclosure", () => {
    expect(ensureNaturalAiComment("  잘 해냈어요  ")).toBe("잘 해냈어요");
  });
});
