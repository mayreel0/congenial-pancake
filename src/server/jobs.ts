import "server-only";
import { AiJobStatus, AiJobType, DisplayMode } from "@prisma/client";
import { type ConnectionOptions, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "@/lib/db";
import { generatePraiseComments } from "@/server/ai";
import { publishPostEvent } from "@/server/realtime";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});
// BullMQ and the app resolve different compatible ioredis package instances.
const bullMqConnection = connection as unknown as ConnectionOptions;

export const aiPraiseQueue = new Queue("ai-praise", { connection: bullMqConnection });
export const rankingQueue = new Queue("ranking", { connection: bullMqConnection });

export async function shouldRunInactivityPraise(postId: string): Promise<boolean> {
  const aiCount = await db.praiseComment.count({ where: { postId, isAiGenerated: true } });
  if (aiCount >= 5) return false;

  const humanCount = await db.praiseComment.count({
    where: { postId, isAiGenerated: false, visibilityState: "VISIBLE" }
  });
  return humanCount === 0;
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

      const comments = await generatePraiseComments(
        aiJob.post,
        aiJob.jobType === AiJobType.INITIAL_PRAISE ? 3 : 1
      );
      const created = await Promise.all(
        comments.map((body) =>
          db.praiseComment.create({
            data: {
              postId: aiJob.postId,
              isAiGenerated: true,
              displayMode: DisplayMode.NICKNAME,
              body,
              visibilityState: "VISIBLE"
            }
          })
        )
      );

      await db.aiPraiseJob.update({
        where: { id: aiJob.id },
        data: { status: AiJobStatus.COMPLETED, resultCommentIds: created.map((comment) => comment.id) }
      });

      for (const comment of created) {
        publishPostEvent(aiJob.postId, {
          type: "comment.created",
          postId: aiJob.postId,
          commentId: comment.id
        });
      }
    },
    { connection: bullMqConnection }
  );
}
