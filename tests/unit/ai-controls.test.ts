import { afterEach, describe, expect, it, vi } from "vitest";

const upsert = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
const findMany = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    aiControlSetting: { upsert, update },
    aiUsageEvent: { findMany, create }
  }
}));

import {
  canRunAiPraiseJob,
  getAiControlSetting,
  listTodayAiUsageEvents,
  getTodayAiUsage,
  recordAiUsageEvent,
  updateAiControlSetting
} from "@/server/ai-controls";

describe("AI usage controls", () => {
  afterEach(() => {
    upsert.mockReset();
    update.mockReset();
    findMany.mockReset();
    create.mockReset();
  });

  it("creates default AI controls as enabled with conservative limits", async () => {
    upsert.mockResolvedValueOnce({
      id: "global",
      enabled: true,
      dailyJobLimit: 100,
      dailyCommentLimit: 300
    });

    await expect(getAiControlSetting()).resolves.toMatchObject({
      enabled: true,
      dailyJobLimit: 100,
      dailyCommentLimit: 300
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { id: "global" },
      create: { id: "global", enabled: true, dailyJobLimit: 100, dailyCommentLimit: 300 },
      update: {}
    });
  });

  it("rejects invalid moderator limit updates", async () => {
    await expect(updateAiControlSetting({ dailyJobLimit: 10001 })).rejects.toThrow("AI_LIMIT_INVALID");
    expect(update).not.toHaveBeenCalled();
  });

  it("skips before provider calls when AI is disabled", async () => {
    upsert.mockResolvedValueOnce({ enabled: false, dailyJobLimit: 100, dailyCommentLimit: 300 });
    findMany.mockResolvedValueOnce([]);

    await expect(canRunAiPraiseJob({ requestedComments: 1 })).resolves.toEqual({
      allowed: false,
      reason: "disabled"
    });
  });

  it("skips when today's executed jobs reach the daily limit", async () => {
    upsert.mockResolvedValueOnce({ enabled: true, dailyJobLimit: 1, dailyCommentLimit: 300 });
    findMany.mockResolvedValueOnce([{ status: "RUN", generatedComments: 1 }]);

    await expect(canRunAiPraiseJob({ requestedComments: 1 })).resolves.toEqual({
      allowed: false,
      reason: "daily_job_limit"
    });
  });

  it("skips when requested comments would exceed the daily comment limit", async () => {
    upsert.mockResolvedValueOnce({ enabled: true, dailyJobLimit: 100, dailyCommentLimit: 2 });
    findMany.mockResolvedValueOnce([{ status: "RUN", generatedComments: 2 }]);

    await expect(canRunAiPraiseJob({ requestedComments: 1 })).resolves.toEqual({
      allowed: false,
      reason: "daily_comment_limit"
    });
  });

  it("summarizes today's usage events", async () => {
    findMany.mockResolvedValueOnce([
      { status: "RUN", generatedComments: 2 },
      { status: "SKIPPED", generatedComments: 0 },
      { status: "FAILED", generatedComments: 0 }
    ]);

    await expect(getTodayAiUsage()).resolves.toEqual({
      executedJobs: 2,
      generatedComments: 2,
      skippedJobs: 1,
      failedJobs: 1
    });
  });

  it("lists today's usage events for moderator review", async () => {
    const now = new Date("2026-07-16T09:30:00.000Z");
    findMany.mockResolvedValueOnce([{ id: "event_1", status: "FAILED", reason: "provider_error" }]);

    await expect(listTodayAiUsageEvents(now)).resolves.toEqual([
      { id: "event_1", status: "FAILED", reason: "provider_error" }
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: new Date("2026-07-16T00:00:00.000Z"),
          lt: new Date("2026-07-17T00:00:00.000Z")
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  });

  it("records usage events with stable reasons", async () => {
    create.mockResolvedValueOnce({ id: "event_1" });

    await recordAiUsageEvent({
      jobId: "job_1",
      postId: "post_1",
      provider: "gemini",
      model: "gemini-2.5-flash-lite",
      status: "SKIPPED",
      reason: "disabled",
      requestedComments: 3,
      generatedComments: 0,
      promptText: "칭찬 글",
      responseTexts: []
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "SKIPPED",
        reason: "disabled",
        requestedComments: 3,
        generatedComments: 0,
        estimatedResponseTokens: 0
      })
    });
  });
});
