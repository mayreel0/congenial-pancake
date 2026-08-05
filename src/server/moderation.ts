import {
  ModerationEventType,
  ModerationTargetType,
  ReportStatus,
  SanctionState,
  VisibilityState,
  Prisma
} from "@prisma/client";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/server/permissions";

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
const acceptedActionableReportTrustDelta = -10;
type ReviewableReportStatus = Extract<ReportStatus, "REVIEWED" | "DISMISSED">;
type ComfortModerationTargetType = Extract<ModerationTargetType, "COMFORT_REQUEST" | "COMFORT_REPLY">;

type ModerationTransaction = Prisma.TransactionClient;

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
  const reporter = await db.user.findUniqueOrThrow({
    where: { id: reporterUserId },
    select: { sanctionState: true }
  });
  assertCanWrite(reporter);

  return db.$transaction(async (tx) => {
    const existingReport = await tx.report.findFirst({
      where: { reporterUserId, targetType, targetId }
    });
    if (existingReport) {
      return existingReport;
    }

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

export async function reviewComfortContentVisibility(input: {
  targetType: ComfortModerationTargetType;
  targetId: string;
  moderatorId: string;
  status: VisibilityState;
  reason: string;
}) {
  return db.$transaction(async (tx) => {
    const target =
      input.targetType === ModerationTargetType.COMFORT_REQUEST
        ? await tx.comfortRequest.update({
            where: { id: input.targetId },
            data: { status: input.status }
          })
        : await tx.comfortReply.update({
            where: { id: input.targetId },
            data: { status: input.status }
          });
    const event = await tx.moderationEvent.create({
      data: {
        userId: input.moderatorId,
        targetType: input.targetType,
        targetId: input.targetId,
        eventType: ModerationEventType.VISIBILITY_CHANGED,
        riskReason: input.reason,
        trustScoreDelta: 0
      }
    });

    return [target, event] as const;
  });
}

export async function reviewReport(input: {
  reportId: string;
  moderatorId: string;
  status: ReviewableReportStatus;
  reason: string;
}) {
  return db.$transaction(async (tx) => {
    const guardedUpdate = await tx.report.updateMany({
      where: { id: input.reportId, status: ReportStatus.OPEN },
      data: { status: input.status }
    });
    const report = await tx.report.findUniqueOrThrow({ where: { id: input.reportId } });

    if (guardedUpdate.count === 0) {
      return [report, null] as const;
    }

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

    if (input.status === ReportStatus.REVIEWED) {
      const targetAuthorId = await resolveReportTargetAuthorId(tx, report.targetType, report.targetId);
      if (targetAuthorId) {
        await applyTrustDeltaInTransaction(
          tx,
          targetAuthorId,
          acceptedActionableReportTrustDelta,
          "accepted_actionable_report"
        );
      }
    }
    // TODO: Consider a small reporter penalty after repeated dismissed reports; normal dismissals stay zero-impact.

    return [report, event] as const;
  });
}

async function resolveReportTargetAuthorId(
  tx: ModerationTransaction,
  targetType: ModerationTargetType,
  targetId: string
): Promise<string | null> {
  if (targetType === ModerationTargetType.USER) {
    const user = await tx.user.findUnique({
      where: { id: targetId },
      select: { id: true }
    });
    return user?.id ?? null;
  }

  if (targetType === ModerationTargetType.COMFORT_REQUEST) {
    const request = await tx.comfortRequest.findUnique({
      where: { id: targetId },
      select: { authorUserId: true }
    });
    return request?.authorUserId ?? null;
  }

  if (targetType === ModerationTargetType.COMFORT_REPLY) {
    const reply = await tx.comfortReply.findUnique({
      where: { id: targetId },
      select: { authorUserId: true }
    });
    return reply?.authorUserId ?? null;
  }

  return null;
}

async function applyTrustDeltaInTransaction(
  tx: ModerationTransaction,
  userId: string,
  delta: number,
  reason: string
) {
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
}
