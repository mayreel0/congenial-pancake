import { AiUsageEventStatus, ReportStatus, VisibilityState } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const praiseCommentCount = vi.hoisted(() => vi.fn());
const reportCount = vi.hoisted(() => vi.fn());
const aiUsageEventCount = vi.hoisted(() => vi.fn());
const workerHeartbeatFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    praiseComment: { count: praiseCommentCount },
    report: { count: reportCount },
    aiUsageEvent: { count: aiUsageEventCount },
    workerHeartbeat: { findUnique: workerHeartbeatFindUnique }
  }
}));

vi.mock("server-only", () => ({}));

import { getModerationDashboardSummary } from "@/server/moderation-summary";

describe("moderation dashboard summary", () => {
  afterEach(() => {
    praiseCommentCount.mockReset();
    reportCount.mockReset();
    aiUsageEventCount.mockReset();
    workerHeartbeatFindUnique.mockReset();
  });

  it("counts the moderator triage work and worker heartbeat for the current UTC day", async () => {
    praiseCommentCount.mockResolvedValueOnce(7);
    reportCount.mockResolvedValueOnce(3);
    aiUsageEventCount.mockResolvedValueOnce(2);
    workerHeartbeatFindUnique.mockResolvedValueOnce({
      id: "combined-jobs-worker",
      lastSeenAt: new Date("2026-07-24T15:25:00.000Z")
    });

    await expect(getModerationDashboardSummary(new Date("2026-07-24T15:30:00.000Z"))).resolves.toMatchObject({
      pendingCommentCount: 7,
      openReportCount: 3,
      todayAiFailureCount: 2,
      workerHealth: expect.objectContaining({
        status: expect.any(String),
        label: expect.any(String),
        lastSeenAt: new Date("2026-07-24T15:25:00.000Z"),
        configWarningCount: expect.any(Number)
      })
    });

    expect(praiseCommentCount).toHaveBeenCalledWith({
      where: { visibilityState: { in: [VisibilityState.HELD, VisibilityState.AUTHOR_ONLY, VisibilityState.HIDDEN] } }
    });
    expect(reportCount).toHaveBeenCalledWith({
      where: { status: ReportStatus.OPEN }
    });
    expect(aiUsageEventCount).toHaveBeenCalledWith({
      where: {
        status: AiUsageEventStatus.FAILED,
        createdAt: {
          gte: new Date("2026-07-24T00:00:00.000Z"),
          lt: new Date("2026-07-25T00:00:00.000Z")
        }
      }
    });
    expect(workerHeartbeatFindUnique).toHaveBeenCalledWith({
      where: { id: "combined-jobs-worker" },
      select: { lastSeenAt: true }
    });
  });
});
