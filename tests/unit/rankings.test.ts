import { afterEach, describe, expect, it, vi } from "vitest";

const userFindMany = vi.hoisted(() => vi.fn());
const postFindMany = vi.hoisted(() => vi.fn());
const snapshotUpsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    user: { findMany: userFindMany },
    praisePost: { findMany: postFindMany },
    rankingSnapshot: { upsert: snapshotUpsert }
  }
}));

import { calculateWarmPraiserScore, parseNeedsEncouragementEntries, parseWarmPraiserEntries, recomputeRankingSnapshots } from "@/server/rankings";

describe("ranking score", () => {
  it("rewards gratitude and penalizes reports", () => {
    const score = calculateWarmPraiserScore({
      gratitudeCount: 10,
      visibleCommentCount: 12,
      reportCount: 0,
      moderationPenalty: 0
    });

    expect(score).toBe(62);
  });

  it("does not reward raw volume alone", () => {
    const score = calculateWarmPraiserScore({
      gratitudeCount: 0,
      visibleCommentCount: 50,
      reportCount: 0,
      moderationPenalty: 0
    });

    expect(score).toBeLessThan(20);
  });

  it("never returns a negative score", () => {
    const score = calculateWarmPraiserScore({
      gratitudeCount: 0,
      visibleCommentCount: 1,
      reportCount: 10,
      moderationPenalty: 50
    });

    expect(score).toBe(0);
  });
});

describe("ranking recomputation", () => {
  afterEach(() => {
    userFindMany.mockReset();
    postFindMany.mockReset();
    snapshotUpsert.mockReset();
  });

  it("upserts warm praiser and needs encouragement snapshots", async () => {
    userFindMany.mockResolvedValueOnce([
      {
        id: "user_1",
        nickname: "따뜻이",
        trustScore: 100,
        comments: [{ id: "comment_1", reactions: [{ id: "reaction_1" }], reports: [] }]
      }
    ]);
    postFindMany.mockResolvedValueOnce([
      {
        id: "post_1",
        title: "해냈어요",
        createdAt: new Date("2026-07-16T00:00:00.000Z"),
        comments: []
      }
    ]);
    snapshotUpsert.mockResolvedValue({ id: "snapshot_1" });

    await recomputeRankingSnapshots();

    expect(snapshotUpsert).toHaveBeenCalledTimes(2);
    expect(snapshotUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { rankingType_period: { rankingType: "WARM_PRAISER", period: "all" } },
        create: expect.objectContaining({ rankingType: "WARM_PRAISER", period: "all" })
      })
    );
    expect(snapshotUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { rankingType_period: { rankingType: "NEEDS_ENCOURAGEMENT", period: "all" } },
        create: expect.objectContaining({ rankingType: "NEEDS_ENCOURAGEMENT", period: "all" })
      })
    );
  });
});

describe("ranking entry parsing", () => {
  it("parses needs encouragement entries for card rendering", () => {
    expect(
      parseNeedsEncouragementEntries([
        {
          postId: "post_1",
          title: "응원이 필요해요",
          humanCommentCount: 0,
          createdAt: "2026-07-16T00:00:00.000Z"
        }
      ])
    ).toEqual([
      {
        postId: "post_1",
        title: "응원이 필요해요",
        humanCommentCount: 0,
        createdAt: "2026-07-16T00:00:00.000Z"
      }
    ]);
  });

  it("drops malformed warm praiser entries", () => {
    expect(parseWarmPraiserEntries([{ nickname: "따뜻이", score: 5 }, { nickname: "누락" }])).toEqual([
      { nickname: "따뜻이", score: 5 }
    ]);
  });
});
