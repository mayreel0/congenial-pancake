import type { ReplyModerationLogRecord } from './reply-moderation-logs.repository';
import {
  formatReplyModerationLogSummary,
  summarizeReplyModerationLogs,
} from './reply-moderation-log.report';

function makeLog(
  overrides: Partial<ReplyModerationLogRecord> = {},
): ReplyModerationLogRecord {
  return {
    id: 'log-1',
    replyId: 'reply-1',
    action: 'allow',
    categories: [],
    severity: 0,
    confidence: 1,
    reason: '',
    suggestions: [],
    errorReason: null,
    shouldPersistForTraining: true,
    excludedReason: null,
    createdAt: new Date('2026-09-14T00:00:00.000Z'),
    ...overrides,
  };
}

describe('summarizeReplyModerationLogs', () => {
  it('counts every action, even ones that never occurred', () => {
    const summary = summarizeReplyModerationLogs([
      makeLog({ action: 'allow' }),
      makeLog({ action: 'suggest_rewrite', categories: ['judgmental'] }),
    ]);

    expect(summary.total).toBe(2);
    expect(summary.byAction).toEqual({
      allow: 1,
      suggest_rewrite: 1,
      block: 0,
      uncertain: 0,
    });
  });

  it('counts each category a row carries, including rows with multiple categories', () => {
    const summary = summarizeReplyModerationLogs([
      makeLog({ categories: ['judgmental', 'sarcasm'] }),
      makeLog({ categories: ['judgmental'] }),
    ]);

    expect(summary.byCategory).toEqual({ judgmental: 2, sarcasm: 1 });
  });

  it('counts rows excluded from training separately from the action breakdown', () => {
    const summary = summarizeReplyModerationLogs([
      makeLog({ shouldPersistForTraining: false, excludedReason: 'load_test' }),
      makeLog({ shouldPersistForTraining: true }),
    ]);

    expect(summary.excludedFromTraining).toBe(1);
    expect(summary.total).toBe(2);
  });

  it('handles an empty log set', () => {
    const summary = summarizeReplyModerationLogs([]);

    expect(summary.total).toBe(0);
    expect(summary.byCategory).toEqual({});
  });
});

describe('formatReplyModerationLogSummary', () => {
  it('renders totals, every action, and categories sorted by count descending', () => {
    const output = formatReplyModerationLogSummary({
      total: 3,
      excludedFromTraining: 1,
      byAction: { allow: 1, suggest_rewrite: 2, block: 0, uncertain: 0 },
      byCategory: { judgmental: 1, sarcasm: 2 },
    });

    expect(output).toContain('total=3 excludedFromTraining=1');
    expect(output.indexOf('sarcasm')).toBeLessThan(
      output.indexOf('judgmental'),
    );
  });

  it('shows a placeholder when no category ever appeared', () => {
    const output = formatReplyModerationLogSummary({
      total: 1,
      excludedFromTraining: 0,
      byAction: { allow: 1, suggest_rewrite: 0, block: 0, uncertain: 0 },
      byCategory: {},
    });

    expect(output).toContain('(none)');
  });
});
