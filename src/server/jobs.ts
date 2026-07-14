import "server-only";
import { AiJobStatus, AiJobType, DisplayMode } from "@prisma/client";
import { type ConnectionOptions, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "@/lib/db";
import { generatePraiseComments } from "@/server/ai";
import { publishPostEvent } from "@/server/realtime";

const aiCommentCap = 5;
const quietWindowMs = 30 * 60 * 1000;

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

export async function enqueueAiPraiseJob(aiPraiseJob: { id: string; jobType: AiJobType; scheduledAt: Date }) {
  await getAiPraiseQueue().add(
    "process-ai-praise",
    { aiPraiseJobId: aiPraiseJob.id },
    { delay: Math.max(0, aiPraiseJob.scheduledAt.getTime() - Date.now()) }
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

  const recentHumanCount = await db.praiseComment.count({
    where: {
      postId,
      isAiGenerated: false,
      visibilityState: "VISIBLE",
      createdAt: { gte: new Date(Date.now() - quietWindowMs) }
    }
  });
  return recentHumanCount === 0;
}

export function startAiPraiseWorker() {
  return new Worker(
    "ai-praise",
    async (job) => {
      const aiJob = await db.aiPraiseJob.update({
        where: { id: job.data.aiPraiseJobId },
        data: { status: AiJobStatus.RUNNING },
        include: { post: true }
      });

      if (aiJob.jobType === AiJobType.INACTIVITY_PRAISE) {
        const shouldRun = await shouldRunInactivityPraise(aiJob.postId);
        if (!shouldRun) {
          await db.aiPraiseJob.update({ where: { id: aiJob.id }, data: { status: AiJobStatus.SKIPPED } });
          return;
        }
      }

      const requestedCount = aiJob.jobType === AiJobType.INITIAL_PRAISE ? 3 : 1;
      const comments = await generatePraiseComments(aiJob.post, requestedCount);
      const created = await db.$transaction(async (tx) => {
        const currentAiCount = await tx.praiseComment.count({
          where: { postId: aiJob.postId, isAiGenerated: true }
        });
        const remaining = Math.max(0, aiCommentCap - currentAiCount);
        const allowedComments = comments.slice(0, remaining);

        const createdComments = await Promise.all(
          allowedComments.map((body) =>
            tx.praiseComment.create({
              data: {
                postId: aiJob.postId,
                isAiGenerated: true,
                displayMode: DisplayMode.NICKNAME,
                body: ensureAiDisclosure(body),
                visibilityState: "VISIBLE"
              }
            })
          )
        );

        await tx.aiPraiseJob.update({
          where: { id: aiJob.id },
          data: {
            status: createdComments.length > 0 ? AiJobStatus.COMPLETED : AiJobStatus.SKIPPED,
            resultCommentIds: createdComments.map((comment) => comment.id)
          }
        });

        return createdComments;
      });

      for (const comment of created) {
        publishPostEvent(aiJob.postId, {
          type: "comment.created",
          postId: aiJob.postId,
          commentId: comment.id
        });
      }
    },
    { connection: getBullMqConnection() }
  );
}
