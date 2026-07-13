import {
  ModerationEventType,
  ModerationTargetType,
  SanctionState,
  VisibilityState
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

export async function applyTrustDelta(userId: string, delta: number, reason: string) {
  return db.$transaction(async (tx) => {
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
  });
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
