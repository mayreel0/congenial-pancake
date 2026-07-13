import { DisplayMode, Prisma, VisibilityState } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

const postInputSchema = z.object({
  title: z.string().trim().min(1, "POST_TITLE_REQUIRED").max(120),
  body: z.string().trim().min(1, "POST_BODY_REQUIRED").max(3000),
  displayMode: z.nativeEnum(DisplayMode),
  promptAnswers: z.record(z.string()).nullable()
});

export type CreatePostInput = z.input<typeof postInputSchema>;

export function normalizePostInput(input: CreatePostInput) {
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "INVALID_POST_INPUT");
  }
  return parsed.data;
}

export async function createPraisePost(input: CreatePostInput, authorUserId: string) {
  const data = normalizePostInput(input);
  return db.$transaction(async (tx) => {
    const post = await tx.praisePost.create({
      data: {
        authorUserId,
        displayMode: data.displayMode,
        title: data.title,
        body: data.body,
        promptAnswers: data.promptAnswers ?? Prisma.JsonNull
      }
    });

    await tx.aiPraiseJob.create({
      data: {
        postId: post.id,
        jobType: "INITIAL_PRAISE",
        scheduledAt: new Date()
      }
    });

    return post;
  });
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
