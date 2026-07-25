import { AiUsageEventStatus, ReportStatus, VisibilityState } from "@prisma/client";
import { db } from "@/lib/db";
import { getUtcDayRange } from "@/server/ai-controls";
import { getWorkerHealthSummary, type WorkerHealthSummary } from "@/server/worker-health";

export type ModerationDashboardSummary = {
  pendingCommentCount: number;
  openReportCount: number;
  todayAiFailureCount: number;
  workerHealth: WorkerHealthSummary;
};

export async function getModerationDashboardSummary(now = new Date()): Promise<ModerationDashboardSummary> {
  const { start, end } = getUtcDayRange(now);
  const [pendingCommentCount, openReportCount, todayAiFailureCount, workerHealth] = await Promise.all([
    db.praiseComment.count({
      where: { visibilityState: { in: [VisibilityState.HELD, VisibilityState.AUTHOR_ONLY, VisibilityState.HIDDEN] } }
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
    pendingCommentCount,
    openReportCount,
    todayAiFailureCount,
    workerHealth
  };
}
