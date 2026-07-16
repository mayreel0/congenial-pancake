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

export async function recomputeRankingSnapshots() {
  const [users, posts] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        nickname: true,
        trustScore: true,
        comments: {
          where: { visibilityState: "VISIBLE", isAiGenerated: false },
          select: {
            id: true,
            reactions: { select: { id: true } }
          }
        }
      },
      take: 100
    }),
    db.praisePost.findMany({
      where: { status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        createdAt: true,
        comments: {
          where: { visibilityState: "VISIBLE", isAiGenerated: false },
          select: { id: true }
        }
      }
    })
  ]);

  const warmPraisers = users
    .map((user) => ({
      userId: user.id,
      nickname: user.nickname,
      score: calculateWarmPraiserScore({
        gratitudeCount: user.comments.reduce((sum, comment) => sum + comment.reactions.length, 0),
        visibleCommentCount: user.comments.length,
        reportCount: 0,
        moderationPenalty: Math.max(0, 100 - user.trustScore)
      })
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const needsEncouragement = posts
    .map((post) => ({
      postId: post.id,
      title: post.title,
      humanCommentCount: post.comments.length,
      createdAt: post.createdAt.toISOString()
    }))
    .sort((a, b) => a.humanCommentCount - b.humanCommentCount || a.createdAt.localeCompare(b.createdAt))
    .slice(0, 20);

  return Promise.all([
    db.rankingSnapshot.upsert({
      where: { rankingType_period: { rankingType: RankingType.WARM_PRAISER, period: "all" } },
      create: { rankingType: RankingType.WARM_PRAISER, period: "all", entries: warmPraisers },
      update: { entries: warmPraisers }
    }),
    db.rankingSnapshot.upsert({
      where: { rankingType_period: { rankingType: RankingType.NEEDS_ENCOURAGEMENT, period: "all" } },
      create: { rankingType: RankingType.NEEDS_ENCOURAGEMENT, period: "all", entries: needsEncouragement },
      update: { entries: needsEncouragement }
    })
  ]);
}
