import { AiUsageEventStatus, ReportStatus, VisibilityState } from "@prisma/client";
import { db } from "@/lib/db";
import { getUtcDayRange } from "@/server/ai-controls";
import { getWorkerHealthSummary, type WorkerHealthSummary } from "@/server/worker-health";

export type ModerationDashboardSummary = {
  pendingRequestCount: number;
  pendingReplyCount: number;
  openReportCount: number;
  todayAiFailureCount: number;
  workerHealth: WorkerHealthSummary;
};

export async function getModerationDashboardSummary(now = new Date()): Promise<ModerationDashboardSummary> {
  const { start, end } = getUtcDayRange(now);
  const pendingStatuses = [VisibilityState.HELD, VisibilityState.AUTHOR_ONLY, VisibilityState.HIDDEN];
  const [pendingRequestCount, pendingReplyCount, openReportCount, todayAiFailureCount, workerHealth] = await Promise.all([
    db.comfortRequest.count({
      where: { status: { in: pendingStatuses } }
    }),
    db.comfortReply.count({
      where: { status: { in: pendingStatuses } }
    }),
    db.report.count({
      where: { status: ReportStatus.OPEN }
    }),
    db.aiUsageEvent.count({
      where: {
        status: AiUsageEventStatus.FAILED,
        createdAt: { gte: start, lt: end }
      }
    }),
    getWorkerHealthSummary(process.env, now)
  ]);

  return {
    pendingRequestCount,
    pendingReplyCount,
    openReportCount,
    todayAiFailureCount,
    workerHealth
  };
}
