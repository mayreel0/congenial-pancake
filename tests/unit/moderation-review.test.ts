import { describe, expect, it, vi, afterEach } from "vitest";

const reportFindMany = vi.hoisted(() => vi.fn());
const reportCount = vi.hoisted(() => vi.fn());
const praisePostFindMany = vi.hoisted(() => vi.fn());
const praiseCommentFindMany = vi.hoisted(() => vi.fn());
const replyFindMany = vi.hoisted(() => vi.fn());
const userFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    report: { findMany: reportFindMany, count: reportCount },
    praisePost: { findMany: praisePostFindMany },
    praiseComment: { findMany: praiseCommentFindMany },
    reply: { findMany: replyFindMany },
    user: { findMany: userFindMany }
  }
}));

import { listOpenReportsForModeration } from "@/server/moderation-review";

describe("listOpenReportsForModeration", () => {
  afterEach(() => {
    reportFindMany.mockReset();
    reportCount.mockReset();
    praisePostFindMany.mockReset();
    praiseCommentFindMany.mockReset();
    replyFindMany.mockReset();
    userFindMany.mockReset();
  });

  it("adds reporter, target preview, target author, and prior review counts", async () => {
    reportFindMany.mockResolvedValue([
      {
        id: "report_comment",
        reason: "모욕",
        targetType: "COMMENT",
        targetId: "comment_1",
        reporter: { nickname: "신고자", trustScore: 92, sanctionState: "NORMAL" }
      }
    ]);
    praisePostFindMany.mockResolvedValue([]);
    praiseCommentFindMany.mockResolvedValue([
      {
        id: "comment_1",
        body: "이건 너무 심한 말이에요",
        author: { id: "author_1", nickname: "작성자", trustScore: 47, sanctionState: "LOW_TRUST" }
      }
    ]);
    replyFindMany.mockResolvedValue([]);
    userFindMany.mockResolvedValue([]);
    reportCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    await expect(listOpenReportsForModeration()).resolves.toEqual([
      expect.objectContaining({
        id: "report_comment",
        reporter: { nickname: "신고자", trustScore: 92, sanctionState: "NORMAL" },
        targetPreview: "이건 너무 심한 말이에요",
        targetAuthor: { id: "author_1", nickname: "작성자", trustScore: 47, sanctionState: "LOW_TRUST" },
        priorAcceptedCount: 2,
        priorDismissedCount: 1
      })
    ]);

    expect(reportFindMany).toHaveBeenCalledWith({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reporter: {
          select: { nickname: true, trustScore: true, sanctionState: true }
        }
      }
    });
  });
});
