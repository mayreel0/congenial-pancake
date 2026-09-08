import {
  formatReplyContentModerationEvalJsonl,
  runReplyContentModerationEval,
  type ReplyContentModerationEvalCase,
} from './reply-content-moderation.eval';
import { ReplyContentModerationService } from './reply-content-moderation.service';
import type {
  ReplyRewriter,
  ReplyToneClassifier,
} from './reply-content-moderation.types';

describe('runReplyContentModerationEval', () => {
  it('compares actual moderation actions and category coverage against expected fixtures', async () => {
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
        id: 'privacy-block',
        text: '카톡 아이디 줘.',
        expectedAction: 'block',
        expectedCategories: ['privacy'],
      },
    ];

    const report = await runReplyContentModerationEval(service, cases);

    expect(report.summary).toEqual({
      total: 3,
      passed: 2,
      failed: 1,
      byExpectedAction: {
        allow: 1,
        suggest_rewrite: 1,
        block: 1,
        uncertain: 0,
      },
      byActualAction: {
        allow: 2,
        suggest_rewrite: 0,
        block: 1,
        uncertain: 0,
      },
    });
    expect(report.results).toEqual([
      expect.objectContaining({
        id: 'kind-allow',
        matchedAction: true,
        missingExpectedCategories: [],
      }),
      expect.objectContaining({
        id: 'dismissive-suggest',
        matchedAction: false,
        missingExpectedCategories: ['emotion_dismissal', 'judgmental'],
      }),
      expect.objectContaining({
        id: 'privacy-block',
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
        '{"type":"summary","total":1,"passed":1,"failed":0,"byExpectedAction":{"allow":1,"suggest_rewrite":0,"block":0,"uncertain":0},"byActualAction":{"allow":1,"suggest_rewrite":0,"block":0,"uncertain":0}}',
        '{"type":"case","id":"kind-allow","expectedAction":"allow","actualAction":"allow","matchedAction":true,"missingExpectedCategories":[],"unexpectedCategories":[],"severity":0,"confidence":0.95,"suggestionCount":0}',
      ].join('\n'),
    );
  });
});
