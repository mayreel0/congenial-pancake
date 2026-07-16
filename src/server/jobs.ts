import { AiJobStatus, AiJobType, DisplayMode, Prisma } from "@prisma/client";
import { type ConnectionOptions, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "@/lib/db";
import { buildPraisePrompt, generatePraiseComments, getAiProviderConfig } from "@/server/ai";
import { canRunAiPraiseJob, recordAiUsageEvent } from "@/server/ai-controls";
import { recomputeRankingSnapshots } from "@/server/rankings";
import { publishPostEvent } from "@/server/realtime";

const aiCommentCap = 5;
const quietWindowMs = 30 * 60 * 1000;
const serializableRetryLimit = 3;

let bullMqConnection: ConnectionOptions | undefined;
let aiPraiseQueueInstance: Queue | undefined;
let rankingQueueInstance: Queue | undefined;

function getBullMqConnection(): ConnectionOptions {
  if (!bullMqConnection) {
    const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null
    });
    // BullMQ and the app resolve different compatible ioredis package instances.
    bullMqConnection = connection as unknown as ConnectionOptions;
  }
  return bullMqConnection;
}

export function getAiPraiseQueue(): Queue {
  aiPraiseQueueInstance ??= new Queue("ai-praise", { connection: getBullMqConnection() });
  return aiPraiseQueueInstance;
}

export function getRankingQueue(): Queue {
  rankingQueueInstance ??= new Queue("ranking", { connection: getBullMqConnection() });
  return rankingQueueInstance;
}

export async function enqueueRankingRecomputeJob() {
  await getRankingQueue().add("recompute-rankings", {}, { jobId: `ranking:${new Date().toISOString().slice(0, 10)}` });
}

export async function enqueueAiPraiseJob(aiPraiseJob: { id: string; jobType: AiJobType; scheduledAt: Date }) {
  await getAiPraiseQueue().add(
    "process-ai-praise",
    { aiPraiseJobId: aiPraiseJob.id },
    { delay: Math.max(0, aiPraiseJob.scheduledAt.getTime() - Date.now()), jobId: aiPraiseJob.id }
  );
}

export function ensureAiDisclosure(body: string): string {
  const trimmed = body.trim();
  if (trimmed.startsWith("AI 칭찬:")) return trimmed;
  return `AI 칭찬: ${trimmed}`;
}

export async function shouldRunInactivityPraise(postId: string): Promise<boolean> {
  const aiCount = await db.praiseComment.count({ where: { postId, isAiGenerated: true } });
  if (aiCount >= aiCommentCap) return false;

  const latestHumanComment = await db.praiseComment.findFirst({
    where: {
      postId,
      isAiGenerated: false
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true }
  });

  return isPastQuietWindow(latestHumanComment);
}

export async function scheduleInactivityPraise(postId: string, scheduledAt = new Date(Date.now() + quietWindowMs)) {
  const aiJob = await db.aiPraiseJob.create({
    data: {
      postId,
      jobType: AiJobType.INACTIVITY_PRAISE,
      scheduledAt
    }
  });
  await enqueueAiPraiseJob(aiJob);
  return aiJob;
}

function isPastQuietWindow(latestHumanComment: { createdAt: Date } | null): boolean {
  if (!latestHumanComment) return true;
  return latestHumanComment.createdAt.getTime() <= Date.now() - quietWindowMs;
}

function isTerminalAiJob(job: { status: AiJobStatus; resultCommentIds: string[] }): boolean {
  return job.status === AiJobStatus.COMPLETED || job.status === AiJobStatus.SKIPPED || job.resultCommentIds.length > 0;
}

async function createAiCommentsWithinCap(aiJobId: string, postId: string, jobType: AiJobType, comments: string[]) {
  for (let attempt = 1; attempt <= serializableRetryLimit; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const currentJob = await tx.aiPraiseJob.findUniqueOrThrow({ where: { id: aiJobId } });
          if (isTerminalAiJob(currentJob)) {
            return [] as Array<{ id: string }>;
          }

          if (jobType === AiJobType.INACTIVITY_PRAISE) {
            const latestHumanComment = await tx.praiseComment.findFirst({
              where: { postId, isAiGenerated: false },
              orderBy: { createdAt: "desc" },
              select: { createdAt: true }
            });
            if (!isPastQuietWindow(latestHumanComment)) {
              await tx.aiPraiseJob.update({ where: { id: aiJobId }, data: { status: AiJobStatus.SKIPPED } });
              return [] as Array<{ id: string }>;
            }
          }

          const currentAiCount = await tx.praiseComment.count({
            where: { postId, isAiGenerated: true }
          });
          const remaining = Math.max(0, aiCommentCap - currentAiCount);
          const allowedComments = comments.slice(0, remaining);

          const createdComments = await Promise.all(
            allowedComments.map((body) =>
              tx.praiseComment.create({
                data: {
                  postId,
                  isAiGenerated: true,
                  displayMode: DisplayMode.NICKNAME,
                  body: ensureAiDisclosure(body),
                  visibilityState: "VISIBLE"
                }
              })
            )
          );

          await tx.aiPraiseJob.update({
            where: { id: aiJobId },
            data: {
              status: createdComments.length > 0 ? AiJobStatus.COMPLETED : AiJobStatus.SKIPPED,
              resultCommentIds: createdComments.map((comment) => comment.id)
            }
          });

          return createdComments;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < serializableRetryLimit
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("AI_COMMENT_CAP_RETRY_EXHAUSTED");
}

export async function processAiPraiseJob(aiPraiseJobId: string) {
  const existingAiJob = await db.aiPraiseJob.findUniqueOrThrow({
    where: { id: aiPraiseJobId },
    include: { post: true }
  });
  if (isTerminalAiJob(existingAiJob)) {
    return;
  }

  const aiJob = await db.aiPraiseJob.update({
    where: { id: existingAiJob.id },
    data: { status: AiJobStatus.RUNNING },
    include: { post: true }
  });

  const requestedCount = aiJob.jobType === AiJobType.INITIAL_PRAISE ? 3 : 1;
  const config = getAiProviderConfig();
  const promptText = buildPraisePrompt(aiJob.post);

  if (aiJob.jobType === AiJobType.INACTIVITY_PRAISE) {
    const shouldRun = await shouldRunInactivityPraise(aiJob.postId);
    if (!shouldRun) {
      await db.aiPraiseJob.update({ where: { id: aiJob.id }, data: { status: AiJobStatus.SKIPPED } });
      await recordAiUsageEvent({
        jobId: aiJob.id,
        postId: aiJob.postId,
        provider: config.provider,
        model: config.model,
        status: "SKIPPED",
        reason: "inactivity_condition",
        requestedComments: requestedCount,
        generatedComments: 0,
        promptText,
        responseTexts: []
      });
      return;
    }
  }

  const decision = await canRunAiPraiseJob({ requestedComments: requestedCount });
  if (!decision.allowed) {
    await db.aiPraiseJob.update({ where: { id: aiJob.id }, data: { status: AiJobStatus.SKIPPED } });
    await recordAiUsageEvent({
      jobId: aiJob.id,
      postId: aiJob.postId,
      provider: config.provider,
      model: config.model,
      status: "SKIPPED",
      reason: decision.reason,
      requestedComments: requestedCount,
      generatedComments: 0,
      promptText,
      responseTexts: []
    });
    return;
  }

  let comments: string[];
  try {
    comments = await generatePraiseComments(aiJob.post, requestedCount);
  } catch (error) {
    await db.aiPraiseJob.update({ where: { id: aiJob.id }, data: { status: AiJobStatus.FAILED } });
    await recordAiUsageEvent({
      jobId: aiJob.id,
      postId: aiJob.postId,
      provider: config.provider,
      model: config.model,
      status: "FAILED",
      reason: "provider_error",
      requestedComments: requestedCount,
      generatedComments: 0,
      promptText,
      responseTexts: []
    });
    throw error;
  }

  const created = await createAiCommentsWithinCap(aiJob.id, aiJob.postId, aiJob.jobType, comments);

  await recordAiUsageEvent({
    jobId: aiJob.id,
    postId: aiJob.postId,
    provider: config.provider,
    model: config.model,
    status: created.length > 0 ? "RUN" : "SKIPPED",
    reason: created.length > 0 ? "completed" : "post_ai_comment_cap",
    requestedComments: requestedCount,
    generatedComments: created.length,
    promptText,
    responseTexts: comments.slice(0, created.length)
  });

  for (const comment of created) {
    publishPostEvent(aiJob.postId, {
      type: "comment.created",
      postId: aiJob.postId,
      commentId: comment.id
    });
  }
}

export function startAiPraiseWorker() {
  return new Worker(
    "ai-praise",
    async (job) => {
      await processAiPraiseJob(job.data.aiPraiseJobId);
    },
    { connection: getBullMqConnection() }
  );
}

export function startRankingWorker() {
  return new Worker(
    "ranking",
    async () => {
      await recomputeRankingSnapshots();
    },
    { connection: getBullMqConnection() }
  );
}
