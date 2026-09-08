import type {
  ModerationAction,
  ModerationCategory,
  ModerationResult,
} from './reply-content-moderation.types';
import type { ReplyContentModerationService } from './reply-content-moderation.service';

export type ReplyContentModerationEvalCase = {
  id: string;
  text: string;
  expectedAction: ModerationAction;
  expectedCategories: ModerationCategory[];
};

export type ReplyContentModerationEvalResult = {
  id: string;
  text: string;
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
  suggestions: string[];
};

export type ReplyContentModerationEvalSummary = {
  total: number;
  passed: number;
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

    results.push({
      id: item.id,
      text: item.text,
      expectedAction: item.expectedAction,
      expectedCategories: item.expectedCategories,
      actualAction: result.action,
      actualCategories: result.categories,
      matchedAction: result.action === item.expectedAction,
      missingExpectedCategories,
      unexpectedCategories,
      severity: result.severity,
      confidence: result.confidence,
      reason: result.reason,
      suggestions: result.suggestions,
    });
  }

  const byExpectedAction = { ...emptyActionCounts };
  const byActualAction = { ...emptyActionCounts };
  let passed = 0;

  for (const result of results) {
    byExpectedAction[result.expectedAction] += 1;
    byActualAction[result.actualAction] += 1;
    if (result.matchedAction && result.missingExpectedCategories.length === 0) {
      passed += 1;
    }
  }

  return {
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
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
        expectedAction: result.expectedAction,
        actualAction: result.actualAction,
        matchedAction: result.matchedAction,
        missingExpectedCategories: result.missingExpectedCategories,
        unexpectedCategories: result.unexpectedCategories,
        severity: result.severity,
        confidence: result.confidence,
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
      result.matchedAction && result.missingExpectedCategories.length === 0
        ? 'PASS'
        : 'FAIL',
      result.id,
      result.expectedAction,
      result.actualAction,
      result.actualCategories.join(',') || '-',
      result.suggestions.length.toString(),
    ].join('\t'),
  );

  return [
    `total=${report.summary.total} passed=${report.summary.passed} failed=${report.summary.failed}`,
    'status\tid\texpected\tactual\tcategories\tsuggestions',
    ...rows,
  ].join('\n');
}
