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

export function getKstLocalDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function hasWrittenComfortRequestToday(authorUserId: string, now = new Date()) {
  const request = await db.comfortRequest.findUnique({
    where: { authorUserId_localDate: { authorUserId, localDate: getKstLocalDate(now) } },
    select: { id: true }
  });
  return request !== null;
}

function isUniqueConflictForFields(error: unknown, fields: string[]) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;

  const target = error.meta?.target;
  if (Array.isArray(target)) return fields.every((field) => target.includes(field));
  return typeof target === "string" && fields.every((field) => target.includes(field));
}

export async function createComfortRequest(input: ComfortRequestInput, authorUserId: string, now = new Date()) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: authorUserId },
    select: { sanctionState: true }
  });
  assertCanWrite(user);

  const body = normalizeComfortRequestBody(input.body);
  const quality = evaluateContentQuality({ targetType: "COMFORT_REQUEST", text: body });
  const status = qualityDecisionToVisibility(quality);
  let request;

  try {
    request = await db.comfortRequest.create({
      data: {
        authorUserId,
        localDate: getKstLocalDate(now),
        body,
        displayMode: input.displayMode,
        status,
        qualityScore: quality.score,
        qualityLabel: quality.label
      }
    });
  } catch (error) {
    if (isUniqueConflictForFields(error, ["authorUserId", "localDate"])) {
      throw new Error("COMFORT_REQUEST_DAILY_LIMIT");
    }
    throw error;
  }

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
        select: { authorUserId: true, status: true }
      });

      if (request.authorUserId === authorUserId) {
        throw new Error("COMFORT_REPLY_SELF_NOT_ALLOWED");
      }
      if (request.status !== VisibilityState.VISIBLE) {
        throw new Error("COMFORT_REQUEST_NOT_VISIBLE");
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

      if (status === VisibilityState.VISIBLE) {
        const firstReplyUpdate = await tx.comfortRequest.updateMany({
          where: { id: requestId, firstRepliedAt: null },
          data: { firstRepliedAt: reply.createdAt }
        });
        if (firstReplyUpdate.count === 1) {
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
      }

      return reply;
    });
  } catch (error) {
    if (isUniqueConflictForFields(error, ["requestId", "authorUserId"])) {
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
