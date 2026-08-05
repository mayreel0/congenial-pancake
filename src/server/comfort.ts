import {
  DisplayMode,
  ModerationTargetType,
  NotificationType,
  Prisma,
  QualityTargetType,
  VisibilityState
} from "@prisma/client";
import { db } from "@/lib/db";
import { evaluateContentQuality, qualityDecisionToVisibility } from "@/server/content-quality";
import { assertCanWrite } from "@/server/permissions";

type ComfortRequestInput = {
  body: string;
  displayMode: DisplayMode;
};

export type RecentComfortExample = {
  id: string;
  body: string;
  replies: Array<{ id: string; body: string }>;
};

export type AnswerableComfortRequest = {
  id: string;
  body: string;
  replyCount: number;
};

export function normalizeComfortRequestBody(body: string): string {
  const normalized = body.trim();
  if (!normalized) throw new Error("COMFORT_REQUEST_BODY_REQUIRED");
  if (normalized.length > 3000) throw new Error("COMFORT_REQUEST_BODY_TOO_LONG");
  return normalized;
}

export function normalizeComfortReplyBody(body: string): string {
  const normalized = body.trim();
  if (!normalized) throw new Error("COMFORT_REPLY_BODY_REQUIRED");
  if (normalized.length > 1000) throw new Error("COMFORT_REPLY_BODY_TOO_LONG");
  return normalized;
}

export function getUtcDayRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export async function hasWrittenComfortRequestToday(authorUserId: string, now = new Date()) {
  const { start, end } = getUtcDayRange(now);
  const count = await db.comfortRequest.count({
    where: { authorUserId, createdAt: { gte: start, lt: end } }
  });
  return count > 0;
}

export async function createComfortRequest(input: ComfortRequestInput, authorUserId: string, now = new Date()) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: authorUserId },
    select: { sanctionState: true }
  });
  assertCanWrite(user);

  if (await hasWrittenComfortRequestToday(authorUserId, now)) {
    throw new Error("COMFORT_REQUEST_DAILY_LIMIT");
  }

  const body = normalizeComfortRequestBody(input.body);
  const quality = evaluateContentQuality({ targetType: "COMFORT_REQUEST", text: body });
  const status = qualityDecisionToVisibility(quality);
  const request = await db.comfortRequest.create({
    data: {
      authorUserId,
      body,
      displayMode: input.displayMode,
      status,
      qualityScore: quality.score,
      qualityLabel: quality.label
    }
  });

  await db.contentQualityReview.create({
    data: {
      targetType: QualityTargetType.COMFORT_REQUEST,
      targetId: request.id,
      label: quality.label,
      score: quality.score,
      reason: quality.reason
    }
  });

  return request;
}

export async function createComfortReply(
  requestId: string,
  authorUserId: string,
  input: ComfortRequestInput
) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: authorUserId },
    select: { sanctionState: true }
  });
  assertCanWrite(user);

  const body = normalizeComfortReplyBody(input.body);
  const quality = evaluateContentQuality({ targetType: "COMFORT_REPLY", text: body });
  const status = qualityDecisionToVisibility(quality);

  try {
    return await db.$transaction(async (tx) => {
      const request = await tx.comfortRequest.findUniqueOrThrow({
        where: { id: requestId },
        select: { authorUserId: true, firstRepliedAt: true }
      });

      if (request.authorUserId === authorUserId) {
        throw new Error("COMFORT_REPLY_SELF_NOT_ALLOWED");
      }

      const reply = await tx.comfortReply.create({
        data: {
          requestId,
          authorUserId,
          body,
          displayMode: input.displayMode,
          status,
          qualityScore: quality.score,
          qualityLabel: quality.label
        }
      });

      await tx.contentQualityReview.create({
        data: {
          targetType: QualityTargetType.COMFORT_REPLY,
          targetId: reply.id,
          label: quality.label,
          score: quality.score,
          reason: quality.reason
        }
      });

      if (status === VisibilityState.VISIBLE && request.firstRepliedAt === null) {
        await tx.comfortRequest.update({
          where: { id: requestId },
          data: { firstRepliedAt: reply.createdAt }
        });
        await tx.notification.create({
          data: {
            recipientUserId: request.authorUserId,
            actorUserId: authorUserId,
            type: NotificationType.FIRST_REPLY_ON_REQUEST,
            targetType: ModerationTargetType.COMFORT_REQUEST,
            targetId: requestId,
            requestId,
            replyId: reply.id
          }
        });
      }

      return reply;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("COMFORT_REPLY_ALREADY_EXISTS");
    }
    throw error;
  }
}

export async function listRecentComfortExamples(): Promise<RecentComfortExample[]> {
  return db.comfortRequest.findMany({
    where: { status: VisibilityState.VISIBLE },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      body: true,
      replies: {
        where: { status: VisibilityState.VISIBLE },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, body: true }
      }
    }
  });
}

export async function listAnswerableComfortRequests(userId: string): Promise<AnswerableComfortRequest[]> {
  const requests = await db.comfortRequest.findMany({
    where: {
      authorUserId: { not: userId },
      status: VisibilityState.VISIBLE,
      replies: { none: { authorUserId: userId } }
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      body: true,
      _count: { select: { replies: { where: { status: VisibilityState.VISIBLE } } } }
    }
  });

  return requests.map(({ _count, ...request }) => ({ ...request, replyCount: _count.replies }));
}
