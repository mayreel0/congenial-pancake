import type {
  ModerationAction,
  ModerationCategory,
  ModerationResult,
} from '../reply-content/reply-content-moderation.types';
import type { ReplyContentModerationService } from '../reply-content/reply-content-moderation.service';

export type ReplyContentModerationEvalCase = {
  id: string;
  text: string;
  expectedAction: ModerationAction;
  expectedCategories: ModerationCategory[];
};

type ReplyContentModerationEvalStatus = 'pass' | 'warn' | 'fail';

type ReplyContentModerationEvalResult = {
  id: string;
  text: string;
  status: ReplyContentModerationEvalStatus;
  expectedAction: ModerationAction;
  expectedCategories: ModerationCategory[];
  actualAction: ModerationAction;
  actualCategories: ModerationCategory[];
  matchedAction: boolean;
  missingExpectedCategories: ModerationCategory[];
  unexpectedCategories: ModerationCategory[];
  severity: ModerationResult['severity'];
  confidence: number;
  reason: string;
  errorReason?: string;
  suggestions: string[];
};

type ReplyContentModerationEvalSummary = {
  total: number;
  passed: number;
  warned: number;
  failed: number;
  byExpectedAction: Record<ModerationAction, number>;
  byActualAction: Record<ModerationAction, number>;
};

export type ReplyContentModerationEvalReport = {
  summary: ReplyContentModerationEvalSummary;
  results: ReplyContentModerationEvalResult[];
};

const emptyActionCounts: Record<ModerationAction, number> = {
  allow: 0,
  suggest_rewrite: 0,
  block: 0,
  uncertain: 0,
};

function categoryDiff(
  left: ModerationCategory[],
  right: ModerationCategory[],
): ModerationCategory[] {
  const rightSet = new Set(right);
  return left.filter((category) => !rightSet.has(category));
}

function evaluateStatus(params: {
  expectedAction: ModerationAction;
  matchedAction: boolean;
  missingExpectedCategories: ModerationCategory[];
  unexpectedCategories: ModerationCategory[];
}): ReplyContentModerationEvalStatus {
  if (!params.matchedAction) return 'fail';

  if (
    params.missingExpectedCategories.length === 0 &&
    params.unexpectedCategories.length === 0
  ) {
    return 'pass';
  }

  if (params.expectedAction === 'block') return 'fail';

  return 'warn';
}

export async function runReplyContentModerationEval(
  service: ReplyContentModerationService,
  cases: ReplyContentModerationEvalCase[],
): Promise<ReplyContentModerationEvalReport> {
  const results: ReplyContentModerationEvalResult[] = [];

  for (const item of cases) {
    const result = await service.moderate({
      text: item.text,
      surface: 'reply',
    });
    const missingExpectedCategories = categoryDiff(
      item.expectedCategories,
      result.categories,
    );
    const unexpectedCategories = categoryDiff(
      result.categories,
      item.expectedCategories,
    );
    const matchedAction = result.action === item.expectedAction;
    const status = evaluateStatus({
      expectedAction: item.expectedAction,
      matchedAction,
      missingExpectedCategories,
      unexpectedCategories,
    });

    results.push({
      id: item.id,
      text: item.text,
      status,
      expectedAction: item.expectedAction,
      expectedCategories: item.expectedCategories,
      actualAction: result.action,
      actualCategories: result.categories,
      matchedAction,
      missingExpectedCategories,
      unexpectedCategories,
      severity: result.severity,
      confidence: result.confidence,
      reason: result.reason,
      errorReason: result.telemetry.errorReason,
      suggestions: result.suggestions,
    });
  }

  const byExpectedAction = { ...emptyActionCounts };
  const byActualAction = { ...emptyActionCounts };
  let passed = 0;
  let warned = 0;
  let failed = 0;

  for (const result of results) {
    byExpectedAction[result.expectedAction] += 1;
    byActualAction[result.actualAction] += 1;
    if (result.status === 'pass') passed += 1;
    if (result.status === 'warn') warned += 1;
    if (result.status === 'fail') failed += 1;
  }

  return {
    summary: {
      total: results.length,
      passed,
      warned,
      failed,
      byExpectedAction,
      byActualAction,
    },
    results,
  };
}

export function formatReplyContentModerationEvalJsonl(
  report: ReplyContentModerationEvalReport,
): string {
  const lines = [
    JSON.stringify({
      type: 'summary',
      ...report.summary,
    }),
  ];

  for (const result of report.results) {
    lines.push(
      JSON.stringify({
        type: 'case',
        id: result.id,
        status: result.status,
        expectedAction: result.expectedAction,
        actualAction: result.actualAction,
        matchedAction: result.matchedAction,
        missingExpectedCategories: result.missingExpectedCategories,
        unexpectedCategories: result.unexpectedCategories,
        severity: result.severity,
        confidence: result.confidence,
        reason: result.reason,
        errorReason: result.errorReason,
        suggestionCount: result.suggestions.length,
      }),
    );
  }

  return lines.join('\n');
}

export function formatReplyContentModerationEvalTable(
  report: ReplyContentModerationEvalReport,
): string {
  const rows = report.results.map((result) =>
    [
      result.status.toUpperCase(),
      result.id,
      result.expectedAction,
      result.actualAction,
      result.actualCategories.join(',') || '-',
      result.suggestions.length.toString(),
      result.reason,
      result.errorReason ?? '-',
    ].join('\t'),
  );

  return [
    `total=${report.summary.total} passed=${report.summary.passed} warned=${report.summary.warned} failed=${report.summary.failed}`,
    'status\tid\texpected\tactual\tcategories\tsuggestions\treason\terror',
    ...rows,
  ].join('\n');
}
