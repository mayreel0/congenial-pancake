import { AiUsageEventStatus } from "@prisma/client";
import { db } from "@/lib/db";

export const aiControlSettingId = "global";

const defaultAiControlSetting = {
  id: aiControlSettingId,
  enabled: true,
  dailyJobLimit: 100,
  dailyCommentLimit: 300
};

type AiUsageStatus = "RUN" | "SKIPPED" | "FAILED";

type AiUsageSummaryEvent = {
  status: AiUsageStatus;
  generatedComments: number;
};

export type AiUsageSummary = {
  executedJobs: number;
  generatedComments: number;
  skippedJobs: number;
  failedJobs: number;
};

export type AiControlUpdateInput = {
  enabled?: boolean;
  dailyJobLimit?: number;
  dailyCommentLimit?: number;
};

export type AiRunDecision = {
  allowed: boolean;
  reason: "allowed" | "disabled" | "daily_job_limit" | "daily_comment_limit";
};

export function getUtcDayRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function estimateTokens(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  return Math.ceil(normalized.length / 4);
}

function assertLimit(value: number | undefined): asserts value is number | undefined {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 0 || value > 10000) {
    throw new Error("AI_LIMIT_INVALID");
  }
}

export async function getAiControlSetting() {
  return db.aiControlSetting.upsert({
    where: { id: aiControlSettingId },
    create: defaultAiControlSetting,
    update: {}
  });
}

export async function updateAiControlSetting(input: AiControlUpdateInput) {
  if (input.enabled !== undefined && typeof input.enabled !== "boolean") {
    throw new Error("AI_ENABLED_INVALID");
  }
  assertLimit(input.dailyJobLimit);
  assertLimit(input.dailyCommentLimit);

  return db.aiControlSetting.upsert({
    where: { id: aiControlSettingId },
    create: { ...defaultAiControlSetting, ...input },
    update: input
  });
}

function summarizeAiUsage(events: AiUsageSummaryEvent[]): AiUsageSummary {
  return events.reduce<AiUsageSummary>(
    (summary, event) => ({
      executedJobs: summary.executedJobs + (event.status === "RUN" || event.status === "FAILED" ? 1 : 0),
      generatedComments: summary.generatedComments + event.generatedComments,
      skippedJobs: summary.skippedJobs + (event.status === "SKIPPED" ? 1 : 0),
      failedJobs: summary.failedJobs + (event.status === "FAILED" ? 1 : 0)
    }),
    { executedJobs: 0, generatedComments: 0, skippedJobs: 0, failedJobs: 0 }
  );
}

export async function getTodayAiUsage(now = new Date()): Promise<AiUsageSummary> {
  const { start, end } = getUtcDayRange(now);
  const events = await db.aiUsageEvent.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { status: true, generatedComments: true }
  });

  return summarizeAiUsage(events as AiUsageSummaryEvent[]);
}

export async function canRunAiPraiseJob(input: { requestedComments: number; now?: Date }): Promise<AiRunDecision> {
  const [setting, usage] = await Promise.all([getAiControlSetting(), getTodayAiUsage(input.now)]);

  if (!setting.enabled) {
    return { allowed: false, reason: "disabled" };
  }
  if (usage.executedJobs >= setting.dailyJobLimit) {
    return { allowed: false, reason: "daily_job_limit" };
  }
  if (usage.generatedComments + input.requestedComments > setting.dailyCommentLimit) {
    return { allowed: false, reason: "daily_comment_limit" };
  }

  return { allowed: true, reason: "allowed" };
}

export async function recordAiUsageEvent(input: {
  jobId?: string | null;
  postId?: string | null;
  provider: string;
  model: string;
  status: AiUsageStatus;
  reason: string;
  requestedComments: number;
  generatedComments: number;
  promptText: string;
  responseTexts: string[];
}) {
  return db.aiUsageEvent.create({
    data: {
      jobId: input.jobId,
      postId: input.postId,
      provider: input.provider,
      model: input.model,
      status: AiUsageEventStatus[input.status],
      reason: input.reason,
      requestedComments: input.requestedComments,
      generatedComments: input.generatedComments,
      estimatedPromptTokens: estimateTokens(input.promptText),
      estimatedResponseTokens: input.responseTexts.reduce((sum, text) => sum + estimateTokens(text), 0)
    }
  });
}
