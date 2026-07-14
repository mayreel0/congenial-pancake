import { DisplayMode, Prisma, VisibilityState } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { enqueueAiPraiseJob } from "@/server/jobs";

const initialInactivityDelayMs = 10 * 60 * 1000;

const promptAnswersSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const entries = Object.entries(value)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([key, answer]) => [key, answer.trim()] as const)
    .filter(([, answer]) => answer.length > 0);

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}, z.record(z.string()).nullable());

const postInputSchema = z.object({
  title: z.string().trim().min(1, "POST_TITLE_REQUIRED").max(120),
  body: z.string().trim().min(1, "POST_BODY_REQUIRED").max(3000),
  displayMode: z.nativeEnum(DisplayMode),
  promptAnswers: promptAnswersSchema
});

export type CreatePostInput = z.input<typeof postInputSchema>;

const postInputErrorCodes = new Set(["POST_TITLE_REQUIRED", "POST_BODY_REQUIRED"]);

export function normalizePostInput(input: CreatePostInput) {
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    throw new Error(message && postInputErrorCodes.has(message) ? message : "INVALID_POST_INPUT");
  }
  return parsed.data;
}

export async function createPraisePost(input: CreatePostInput, authorUserId: string) {
  const data = normalizePostInput(input);
  const { post, aiJobs } = await db.$transaction(async (tx) => {
    const post = await tx.praisePost.create({
      data: {
        authorUserId,
        displayMode: data.displayMode,
        title: data.title,
        body: data.body,
        promptAnswers: data.promptAnswers ?? Prisma.JsonNull
      }
    });

    const initialJob = await tx.aiPraiseJob.create({
      data: {
        postId: post.id,
        jobType: "INITIAL_PRAISE",
        scheduledAt: new Date()
      }
    });

    const inactivityJob = await tx.aiPraiseJob.create({
      data: {
        postId: post.id,
        jobType: "INACTIVITY_PRAISE",
        scheduledAt: new Date(Date.now() + initialInactivityDelayMs)
      }
    });

    return { post, aiJobs: [initialJob, inactivityJob] };
  });

  await Promise.all(aiJobs.map((aiJob) => enqueueAiPraiseJob(aiJob)));

  return post;
}

export async function listFeedPosts() {
  return db.praisePost.findMany({
    where: { status: VisibilityState.VISIBLE },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      author: { select: { nickname: true } },
      comments: {
        where: { visibilityState: VisibilityState.VISIBLE },
        select: { id: true, isAiGenerated: true }
      }
    }
  });
}
