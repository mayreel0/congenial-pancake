import { RankingType, type RankingSnapshot } from "@prisma/client";
import { db } from "@/lib/db";

export type WarmPraiserScoreInput = {
  gratitudeCount: number;
  visibleCommentCount: number;
  reportCount: number;
  moderationPenalty: number;
};

export function calculateWarmPraiserScore(input: WarmPraiserScoreInput): number {
  const gratitude = input.gratitudeCount * 5;
  const consistency = Math.min(input.visibleCommentCount, 19);
  const reports = input.reportCount * 12;
  return Math.max(0, gratitude + consistency - reports - input.moderationPenalty);
}

export async function getRankingSnapshots(): Promise<RankingSnapshot[]> {
  const snapshots = await Promise.all([
    db.rankingSnapshot.findFirst({
      where: { rankingType: RankingType.WARM_PRAISER },
      orderBy: { computedAt: "desc" }
    }),
    db.rankingSnapshot.findFirst({
      where: { rankingType: RankingType.NEEDS_ENCOURAGEMENT },
      orderBy: { computedAt: "desc" }
    })
  ]);

  return snapshots.filter((snapshot): snapshot is RankingSnapshot => snapshot !== null);
}
