import {
  formatReplyContentModerationEvalJsonl,
  formatReplyContentModerationEvalTable,
  runReplyContentModerationEval,
  type ReplyContentModerationEvalCase,
} from './reply-content-moderation.eval';
import { ReplyContentModerationService } from '../reply-content/reply-content-moderation.service';
import type {
  ReplyRewriter,
  ReplyToneClassifier,
} from '../reply-content/reply-content-moderation.types';

describe('runReplyContentModerationEval', () => {
  it('separates action failures from category drift warnings', async () => {
    const classifier: ReplyToneClassifier = {
      classify: (input) => {
        if (input.text.includes('예민')) {
          return Promise.resolve({
            action: 'allow',
            reason: '테스트용 오분류입니다.',
            categories: [],
            severity: 0,
            confidence: 0.7,
          });
        }

        if (input.text.includes('비꼬')) {
          return Promise.resolve({
            action: 'suggest_rewrite',
            reason: '수정 제안은 필요하지만 세부 라벨은 다르게 분류했습니다.',
            categories: ['mockery'],
            severity: 2,
            confidence: 0.82,
          });
        }

        return Promise.resolve({
          action: 'allow',
          reason: '온설의 답장 기준에 어긋나는 표현이 없습니다.',
          categories: [],
          severity: 0,
          confidence: 0.95,
        });
      },
    };
    const rewriter: ReplyRewriter = {
      rewrite: () => Promise.resolve(['많이 힘들었겠어요.']),
    };
    const service = new ReplyContentModerationService(classifier, rewriter);
    const cases: ReplyContentModerationEvalCase[] = [
      {
        id: 'kind-allow',
        text: '많이 힘들었겠어요.',
        expectedAction: 'allow',
        expectedCategories: [],
      },
      {
        id: 'dismissive-suggest',
        text: '너무 예민한 거 아니야?',
        expectedAction: 'suggest_rewrite',
        expectedCategories: ['emotion_dismissal', 'judgmental'],
      },
      {
        id: 'sarcasm-suggest',
        text: '비꼬는 답장입니다.',
        expectedAction: 'suggest_rewrite',
        expectedCategories: ['sarcasm'],
      },
      {
        id: 'privacy-block',
        text: '카톡 아이디 줘.',
        expectedAction: 'block',
        expectedCategories: ['privacy'],
      },
    ];

    const report = await runReplyContentModerationEval(service, cases);

    expect(report.summary).toEqual({
      total: 4,
      passed: 2,
      warned: 1,
      failed: 1,
      byExpectedAction: {
        allow: 1,
        suggest_rewrite: 2,
        block: 1,
        uncertain: 0,
      },
      byActualAction: {
        allow: 2,
        suggest_rewrite: 1,
        block: 1,
        uncertain: 0,
      },
    });
    expect(report.results).toEqual([
      expect.objectContaining({
        id: 'kind-allow',
        status: 'pass',
        matchedAction: true,
        missingExpectedCategories: [],
      }),
      expect.objectContaining({
        id: 'dismissive-suggest',
        status: 'fail',
        matchedAction: false,
        missingExpectedCategories: ['emotion_dismissal', 'judgmental'],
      }),
      expect.objectContaining({
        id: 'sarcasm-suggest',
        status: 'warn',
        matchedAction: true,
        missingExpectedCategories: ['sarcasm'],
        unexpectedCategories: ['mockery'],
      }),
      expect.objectContaining({
        id: 'privacy-block',
        status: 'pass',
        matchedAction: true,
        missingExpectedCategories: [],
      }),
    ]);
  });
});

describe('formatReplyContentModerationEvalJsonl', () => {
  it('prints one summary line followed by one line per evaluated case', async () => {
    const classifier: ReplyToneClassifier = {
      classify: () =>
        Promise.resolve({
          action: 'allow',
          reason: '온설의 답장 기준에 어긋나는 표현이 없습니다.',
          categories: [],
          severity: 0,
          confidence: 0.95,
        }),
    };
    const service = new ReplyContentModerationService(classifier, {
      rewrite: () => Promise.resolve([]),
    });

    const report = await runReplyContentModerationEval(service, [
      {
        id: 'kind-allow',
        text: '많이 힘들었겠어요.',
        expectedAction: 'allow',
        expectedCategories: [],
      },
    ]);

    expect(formatReplyContentModerationEvalJsonl(report)).toBe(
      [
        '{"type":"summary","total":1,"passed":1,"warned":0,"failed":0,"byExpectedAction":{"allow":1,"suggest_rewrite":0,"block":0,"uncertain":0},"byActualAction":{"allow":1,"suggest_rewrite":0,"block":0,"uncertain":0}}',
        '{"type":"case","id":"kind-allow","status":"pass","expectedAction":"allow","actualAction":"allow","matchedAction":true,"missingExpectedCategories":[],"unexpectedCategories":[],"severity":0,"confidence":0.95,"reason":"온설의 답장 기준에 어긋나는 표현이 없습니다.","suggestionCount":0}',
      ].join('\n'),
    );
  });
});

describe('formatReplyContentModerationEvalTable', () => {
  it('prints the model reason for each case', async () => {
    const classifier: ReplyToneClassifier = {
      classify: () =>
        Promise.resolve({
          action: 'allow',
          reason: '짧고 담백한 공감 표현입니다.',
          categories: [],
          severity: 0,
          confidence: 0.95,
        }),
    };
    const service = new ReplyContentModerationService(classifier, {
      rewrite: () => Promise.resolve([]),
    });

    const report = await runReplyContentModerationEval(service, [
      {
        id: 'kind-allow',
        text: '많이 힘들었겠어요.',
        expectedAction: 'allow',
        expectedCategories: [],
      },
    ]);

    expect(formatReplyContentModerationEvalTable(report)).toBe(
      [
        'total=1 passed=1 warned=0 failed=0',
        'status\tid\texpected\tactual\tcategories\tsuggestions\treason\terror',
        'PASS\tkind-allow\tallow\tallow\t-\t0\t짧고 담백한 공감 표현입니다.\t-',
      ].join('\n'),
    );
  });
});
