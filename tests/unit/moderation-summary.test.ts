import { AiUsageEventStatus, ReportStatus, VisibilityState } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const comfortRequestCount = vi.hoisted(() => vi.fn());
const comfortReplyCount = vi.hoisted(() => vi.fn());
const reportCount = vi.hoisted(() => vi.fn());
const aiUsageEventCount = vi.hoisted(() => vi.fn());
const workerHeartbeatFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    comfortRequest: { count: comfortRequestCount },
    comfortReply: { count: comfortReplyCount },
    report: { count: reportCount },
    aiUsageEvent: { count: aiUsageEventCount },
    workerHeartbeat: { findUnique: workerHeartbeatFindUnique }
  }
}));

vi.mock("server-only", () => ({}));

import { getModerationDashboardSummary } from "@/server/moderation-summary";

describe("moderation dashboard summary", () => {
  afterEach(() => {
    comfortRequestCount.mockReset();
    comfortReplyCount.mockReset();
    reportCount.mockReset();
    aiUsageEventCount.mockReset();
    workerHeartbeatFindUnique.mockReset();
  });

  it("counts comfort moderation work and worker heartbeat for the current UTC day", async () => {
    comfortRequestCount.mockResolvedValueOnce(2);
    comfortReplyCount.mockResolvedValueOnce(5);
    reportCount.mockResolvedValueOnce(3);
    aiUsageEventCount.mockResolvedValueOnce(1);
    workerHeartbeatFindUnique.mockResolvedValueOnce({
      id: "combined-jobs-worker",
      lastSeenAt: new Date("2026-07-24T15:25:00.000Z")
    });

    await expect(getModerationDashboardSummary(new Date("2026-07-24T15:30:00.000Z"))).resolves.toMatchObject({
      pendingRequestCount: 2,
      pendingReplyCount: 5,
      openReportCount: 3,
      todayAiFailureCount: 1
    });

    const pendingStatuses = [VisibilityState.HELD, VisibilityState.AUTHOR_ONLY, VisibilityState.HIDDEN];
    expect(comfortRequestCount).toHaveBeenCalledWith({ where: { status: { in: pendingStatuses } } });
    expect(comfortReplyCount).toHaveBeenCalledWith({ where: { status: { in: pendingStatuses } } });
    expect(reportCount).toHaveBeenCalledWith({ where: { status: ReportStatus.OPEN } });
    expect(aiUsageEventCount).toHaveBeenCalledWith({
      where: {
        status: AiUsageEventStatus.FAILED,
        createdAt: {
          gte: new Date("2026-07-24T00:00:00.000Z"),
          lt: new Date("2026-07-25T00:00:00.000Z")
        }
      }
    });
  });
});
