import { DisplayMode, Prisma, VisibilityState } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { enqueueAiPraiseJob, planAiCommentTimes, selectAiPraiseRequestCount } from "@/server/jobs";

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
export type PostSort = "latest" | "oldest";
export const postPageSize = 10;

const postInputErrorCodes = new Set(["POST_TITLE_REQUIRED", "POST_BODY_REQUIRED"]);

export function normalizePostInput(input: CreatePostInput) {
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    throw new Error(message && postInputErrorCodes.has(message) ? message : "INVALID_POST_INPUT");
  }
  return parsed.data;
}

export function normalizePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function normalizeSortParam(value: string | string[] | undefined): PostSort {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "oldest" ? "oldest" : "latest";
}

export function sortToOrder(sort: PostSort): "asc" | "desc" {
  return sort === "oldest" ? "asc" : "desc";
}

export async function createPraisePost(input: CreatePostInput, authorUserId: string) {
  const data = normalizePostInput(input);
  const { post, aiJobs } = await db.$transaction(async (tx) => {
    const initialJobCount = selectAiPraiseRequestCount("INITIAL_PRAISE");
    const initialScheduledTimes = planAiCommentTimes(initialJobCount);
    const post = await tx.praisePost.create({
      data: {
        authorUserId,
        displayMode: data.displayMode,
        title: data.title,
        body: data.body,
        promptAnswers: data.promptAnswers ?? Prisma.JsonNull
      }
    });

    const initialJobs = await Promise.all(
      initialScheduledTimes.map((scheduledAt) =>
        tx.aiPraiseJob.create({
          data: {
            postId: post.id,
            jobType: "INITIAL_PRAISE",
            scheduledAt
          }
        })
      )
    );

    const inactivityJob = await tx.aiPraiseJob.create({
      data: {
        postId: post.id,
        jobType: "INACTIVITY_PRAISE",
        scheduledAt: new Date(Date.now() + initialInactivityDelayMs)
      }
    });

    return { post, aiJobs: [...initialJobs, inactivityJob] };
  });

  await Promise.all(aiJobs.map((aiJob) => enqueueAiPraiseJob(aiJob)));

  return post;
}

export async function listFeedPosts() {
  const { posts } = await listPostsPage({ page: 1, sort: "latest", pageSize: 30 });
  return posts;
}

export async function listPostsPage(input: { page: number; sort: PostSort; pageSize?: number }) {
  const pageSize = input.pageSize ?? postPageSize;
  const where = { status: VisibilityState.VISIBLE };
  const [posts, totalCount] = await Promise.all([
    db.praisePost.findMany({
      where,
      orderBy: { createdAt: sortToOrder(input.sort) },
      skip: (input.page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { select: { nickname: true } },
        comments: {
          where: { visibilityState: VisibilityState.VISIBLE },
          select: { id: true, isAiGenerated: true }
        }
      }
    }),
    db.praisePost.count({ where })
  ]);

  return {
    posts,
    page: input.page,
    sort: input.sort,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize))
  };
}

export async function listRecentPosts(limit = 5) {
  return db.praisePost.findMany({
    where: { status: VisibilityState.VISIBLE },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { nickname: true } },
      comments: {
        where: { visibilityState: VisibilityState.VISIBLE },
        select: { id: true, isAiGenerated: true }
      }
    }
  });
}
