// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { RankingType } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RankingsPage from "@/app/rankings/page";

vi.mock("@/server/rankings", () => ({
  getRankingSnapshots: vi.fn(async () => [
    {
      rankingType: RankingType.WARM_PRAISER,
      period: "all",
      computedAt: new Date("2026-07-17T08:00:00.000Z"),
      entries: []
    },
    {
      rankingType: RankingType.NEEDS_ENCOURAGEMENT,
      period: "all",
      computedAt: new Date("2026-07-17T08:00:00.000Z"),
      entries: [
        {
          postId: "post_1",
          title: "면접을 보고 왔어요",
          humanCommentCount: 0,
          createdAt: "2026-07-17T07:00:00.000Z"
        }
      ]
    }
  ]),
  parseNeedsEncouragementEntries: vi.fn((entries) => entries),
  parseWarmPraiserEntries: vi.fn((entries) => entries)
}));

describe("RankingsPage", () => {
  it("links encouragement-ranked posts with a Korean praise CTA", async () => {
    render(await RankingsPage());

    expect(screen.getByRole("link", { name: "응원하러 가기" })).toHaveAttribute("href", "/posts/post_1");
  });
});
