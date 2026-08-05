import { describe, expect, it, vi, afterEach } from "vitest";

const reportFindMany = vi.hoisted(() => vi.fn());
const reportCount = vi.hoisted(() => vi.fn());
const comfortRequestFindMany = vi.hoisted(() => vi.fn());
const comfortReplyFindMany = vi.hoisted(() => vi.fn());
const userFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    report: { findMany: reportFindMany, count: reportCount },
    comfortRequest: { findMany: comfortRequestFindMany },
    comfortReply: { findMany: comfortReplyFindMany },
    user: { findMany: userFindMany }
  }
}));

import { listOpenReportsForModeration } from "@/server/moderation-review";

describe("listOpenReportsForModeration", () => {
  afterEach(() => {
    reportFindMany.mockReset();
    reportCount.mockReset();
    comfortRequestFindMany.mockReset();
    comfortReplyFindMany.mockReset();
    userFindMany.mockReset();
  });

  it("adds reporter, comfort target preview, target author, and prior review counts", async () => {
    reportFindMany.mockResolvedValue([
      {
        id: "report_reply",
        reason: "기분 나쁜 답변",
        targetType: "COMFORT_REPLY",
        targetId: "reply_1",
        reporter: { nickname: "신고자", trustScore: 92, sanctionState: "NORMAL" }
      }
    ]);
    comfortRequestFindMany.mockResolvedValue([]);
    comfortReplyFindMany.mockResolvedValue([
      {
        id: "reply_1",
        body: "그건 네가 예민한 듯",
        request: { body: "오늘 좀 지쳤어요" },
        author: { id: "author_1", nickname: "작성자", trustScore: 47, sanctionState: "LOW_TRUST" }
      }
    ]);
    userFindMany.mockResolvedValue([]);
    reportCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    await expect(listOpenReportsForModeration()).resolves.toEqual([
      expect.objectContaining({
        id: "report_reply",
        reporter: { nickname: "신고자", trustScore: 92, sanctionState: "NORMAL" },
        targetPreview: "오늘 좀 지쳤어요 그건 네가 예민한 듯",
        targetAuthor: { id: "author_1", nickname: "작성자", trustScore: 47, sanctionState: "LOW_TRUST" },
        priorAcceptedCount: 2,
        priorDismissedCount: 1
      })
    ]);
  });
});
