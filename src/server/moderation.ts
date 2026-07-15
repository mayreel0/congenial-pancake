import {
  ModerationEventType,
  ModerationTargetType,
  ReportStatus,
  SanctionState,
  VisibilityState,
  Prisma
} from "@prisma/client";
import { db } from "@/lib/db";

const riskyPatterns = [
  { pattern: /자랑이라고|그걸.*대단|꼴값|한심|별것도/i, risk: 75, reason: "mocking_praise" },
  { pattern: /못생|살쪘|외모|몸매/i, risk: 70, reason: "appearance_comment" },
  { pattern: /죽어|꺼져|혐오|병신|멍청/i, risk: 95, reason: "abuse" },
  { pattern: /내 채널|구독|홍보|광고/i, risk: 65, reason: "self_promotion" }
];

export function moderateText(text: string): {
  visibilityState: VisibilityState;
  risk: number;
  reason: string;
} {
  const normalized = text.trim();
  const match = riskyPatterns.find((entry) => entry.pattern.test(normalized));
  if (!match) {
    return { visibilityState: VisibilityState.VISIBLE, risk: 0, reason: "allowed" };
  }
  if (match.risk >= 90) {
    return { visibilityState: VisibilityState.HIDDEN, risk: match.risk, reason: match.reason };
  }
  return { visibilityState: VisibilityState.AUTHOR_ONLY, risk: match.risk, reason: match.reason };
}

export function calculateSanctionState(trustScore: number): SanctionState {
  if (trustScore <= 10) return SanctionState.SERVICE_BANNED;
  if (trustScore <= 30) return SanctionState.SHADOW_BANNED;
  if (trustScore <= 60) return SanctionState.LOW_TRUST;
  return SanctionState.NORMAL;
}

const trustDeltaRetryLimit = 3;
type ReviewableReportStatus = Extract<ReportStatus, "REVIEWED" | "DISMISSED">;

export async function applyTrustDelta(userId: string, delta: number, reason: string) {
  for (let attempt = 1; attempt <= trustDeltaRetryLimit; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
          const nextTrustScore = Math.max(0, Math.min(100, user.trustScore + delta));
          const nextSanctionState = calculateSanctionState(nextTrustScore);

          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { trustScore: nextTrustScore, sanctionState: nextSanctionState }
          });

          const event = await tx.moderationEvent.create({
            data: {
              userId,
              targetType: ModerationTargetType.USER,
              targetId: userId,
              eventType: ModerationEventType.TRUST_SCORE_CHANGED,
              riskReason: reason,
              trustScoreDelta: delta
            }
          });

          return [updatedUser, event] as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < trustDeltaRetryLimit
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("TRUST_DELTA_RETRY_EXHAUSTED");
}

export async function recordReport(
  reporterUserId: string,
  targetType: ModerationTargetType,
  targetId: string,
  reason: string
) {
  return db.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: { reporterUserId, targetType, targetId, reason }
    });
    await tx.moderationEvent.create({
      data: {
        userId: reporterUserId,
        targetType,
        targetId,
        eventType: ModerationEventType.REPORT_CREATED,
        riskReason: reason,
        trustScoreDelta: 0
      }
    });
    return report;
  });
}

export async function reviewCommentVisibility(input: {
  commentId: string;
  moderatorId: string;
  visibilityState: VisibilityState;
  reason: string;
}) {
  return db.$transaction(async (tx) => {
    const comment = await tx.praiseComment.update({
      where: { id: input.commentId },
      data: { visibilityState: input.visibilityState }
    });
    const event = await tx.moderationEvent.create({
      data: {
        userId: input.moderatorId,
        targetType: ModerationTargetType.COMMENT,
        targetId: input.commentId,
        eventType: ModerationEventType.VISIBILITY_CHANGED,
        riskReason: input.reason,
        trustScoreDelta: 0
      }
    });

    return [comment, event] as const;
  });
}

export async function reviewReport(input: {
  reportId: string;
  moderatorId: string;
  status: ReviewableReportStatus;
  reason: string;
}) {
  return db.$transaction(async (tx) => {
    const report = await tx.report.update({
      where: { id: input.reportId },
      data: { status: input.status }
    });
    const event = await tx.moderationEvent.create({
      data: {
        userId: input.moderatorId,
        targetType: report.targetType,
        targetId: report.targetId,
        eventType:
          input.status === ReportStatus.REVIEWED
            ? ModerationEventType.REPORT_ACCEPTED
            : ModerationEventType.REPORT_DISMISSED,
        riskReason: input.reason,
        trustScoreDelta: 0
      }
    });

    return [report, event] as const;
  });
}
