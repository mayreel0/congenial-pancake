import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
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
  async countDistinctReporters(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(reports)
      .where(
        and(eq(reports.targetType, targetType), eq(reports.targetId, targetId)),
      );
    return row?.value ?? 0;
  }
}
