import { DisplayMode, ReactionType } from "@prisma/client";
import { db } from "@/lib/db";
import { scheduleInactivityPraise } from "@/server/jobs";
import { moderateText } from "@/server/moderation";

export function normalizeCommentBody(body: string): string {
  const normalized = body.trim();
  if (!normalized) {
    throw new Error("COMMENT_BODY_REQUIRED");
  }
  if (normalized.length > 1000) {
    throw new Error("COMMENT_BODY_TOO_LONG");
  }
  return normalized;
}

export function assertPostAuthor(postAuthorUserId: string, userId: string): void {
  if (postAuthorUserId !== userId) {
    throw new Error("POST_AUTHOR_ONLY");
  }
}

export async function createPraiseComment(
  postId: string,
  authorUserId: string,
  input: { body: string; displayMode: DisplayMode }
) {
  const body = normalizeCommentBody(input.body);
  const moderation = moderateText(body);

  const comment = await db.praiseComment.create({
    data: {
      postId,
      authorUserId,
      displayMode: input.displayMode,
      body,
      visibilityState: moderation.visibilityState,
      moderationRisk: moderation.risk
    }
  });

  await scheduleInactivityPraise(postId);
  return comment;
}

export async function addAuthorReaction(commentId: string, authorUserId: string, type: ReactionType) {
  const comment = await db.praiseComment.findUniqueOrThrow({
    where: { id: commentId },
    include: { post: true }
  });
  assertPostAuthor(comment.post.authorUserId, authorUserId);

  return db.reaction.create({
    data: {
      postId: comment.postId,
      commentId,
      authorUserId,
      type
    }
  });
}

export async function addAuthorReply(commentId: string, authorUserId: string, bodyInput: string) {
  const body = normalizeCommentBody(bodyInput);
  const comment = await db.praiseComment.findUniqueOrThrow({
    where: { id: commentId },
    include: { post: true }
  });
  assertPostAuthor(comment.post.authorUserId, authorUserId);
  const moderation = moderateText(body);

  return db.reply.create({
    data: {
      postId: comment.postId,
      commentId,
      authorUserId,
      body,
      visibilityState: moderation.visibilityState
    }
  });
}
