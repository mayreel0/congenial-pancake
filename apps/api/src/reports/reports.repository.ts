import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gt } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { reports } from '../database/schema';
import type { ReportTargetType } from '../moderation/moderation.service';

export type CreateReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reporterId: string;
};

export type ReportRecord = typeof reports.$inferSelect;

@Injectable()
export class ReportsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateReportInput): Promise<ReportRecord> {
    const [report] = await this.db.insert(reports).values(input).returning();
    return report;
  }

  findByTargetAndReporter(
    targetType: ReportTargetType,
    targetId: string,
    reporterId: string,
  ): Promise<ReportRecord | undefined> {
    return this.db.query.reports.findFirst({
      where: and(
        eq(reports.targetType, targetType),
        eq(reports.targetId, targetId),
        eq(reports.reporterId, reporterId),
      ),
    });
  }

  // A plain row count is safe here because reports_target_reporter_unique
  // guarantees at most one row per (targetType, targetId, reporterId).
  // `since` (a target's reviewedAt, if it's been admin-restored before)
  // excludes reports that pre-date the last review, so an old report that
  // already contributed to a past auto-hide doesn't count again toward the
  // next one — see requests.schema.ts's reviewedAt comment.
  async countDistinctReporters(
    targetType: ReportTargetType,
    targetId: string,
    since?: Date,
  ): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(reports)
      .where(
        and(
          eq(reports.targetType, targetType),
          eq(reports.targetId, targetId),
          since ? gt(reports.createdAt, since) : undefined,
        ),
      );
    return row?.value ?? 0;
  }
}
