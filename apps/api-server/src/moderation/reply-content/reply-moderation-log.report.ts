import type {
  ModerationAction,
  ModerationCategory,
} from './reply-content-moderation.types';
import type { ReplyModerationLogRecord } from './reply-moderation-logs.repository';

export type ReplyModerationLogSummary = {
  total: number;
  excludedFromTraining: number;
  byAction: Record<ModerationAction, number>;
  byCategory: Partial<Record<ModerationCategory, number>>;
};

const EMPTY_BY_ACTION: Record<ModerationAction, number> = {
  allow: 0,
  suggest_rewrite: 0,
  block: 0,
  uncertain: 0,
};

export function summarizeReplyModerationLogs(
  rows: ReplyModerationLogRecord[],
): ReplyModerationLogSummary {
  const byAction = { ...EMPTY_BY_ACTION };
  const byCategory: Partial<Record<ModerationCategory, number>> = {};
  let excludedFromTraining = 0;

  for (const row of rows) {
    byAction[row.action] += 1;
    if (!row.shouldPersistForTraining) excludedFromTraining += 1;
    for (const category of row.categories) {
      byCategory[category] = (byCategory[category] ?? 0) + 1;
    }
  }

  return { total: rows.length, excludedFromTraining, byAction, byCategory };
}

export function formatReplyModerationLogSummary(
  summary: ReplyModerationLogSummary,
): string {
  const actionLines = Object.entries(summary.byAction).map(
    ([action, count]) => `  ${action}\t${count}`,
  );
  const categoryLines = Object.entries(summary.byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([category, count]) => `  ${category}\t${count}`);

  return [
    `total=${summary.total} excludedFromTraining=${summary.excludedFromTraining}`,
    'by action:',
    ...actionLines,
    'by category:',
    ...(categoryLines.length ? categoryLines : ['  (none)']),
  ].join('\n');
}
