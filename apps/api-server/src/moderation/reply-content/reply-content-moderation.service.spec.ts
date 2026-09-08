import {
  ReplyContentModerationService,
  type ReplyToneClassifier,
  type ReplyRewriter,
} from './reply-content-moderation.service';

describe('ReplyContentModerationService', () => {
  let classifier: jest.Mocked<ReplyToneClassifier>;
  let rewriter: jest.Mocked<ReplyRewriter>;
  let service: ReplyContentModerationService;

  beforeEach(() => {
    classifier = {
      classify: jest.fn(),
    };
    rewriter = {
      rewrite: jest.fn(),
    };
    service = new ReplyContentModerationService(classifier, rewriter);
  });

  it('allows an Onseol-style reply without asking for rewrite suggestions', async () => {
    classifier.classify.mockResolvedValue({
      action: 'allow',
      reason: '온설의 답장 기준에 어긋나는 표현이 없습니다.',
      categories: [],
      severity: 0,
      confidence: 0.94,
    });

    const result = await service.moderate({
      text: '많이 힘들었겠어요.',
      surface: 'reply',
    });

    expect(result).toEqual({
      action: 'allow',
      reason: '온설의 답장 기준에 어긋나는 표현이 없습니다.',
      categories: [],
      severity: 0,
      confidence: 0.94,
      suggestions: [],
      telemetry: { shouldPersistForTraining: true },
    });
    expect(rewriter.rewrite).not.toHaveBeenCalled();
  });

  it('returns three Onseol-style suggestions for a judgmental reply', async () => {
    classifier.classify.mockResolvedValue({
      action: 'suggest_rewrite',
      reason: '상대의 감정을 예민함으로 판단하고 축소합니다.',
      categories: ['emotion_dismissal', 'judgmental'],
      severity: 2,
      confidence: 0.86,
    });
    rewriter.rewrite.mockResolvedValue([
      '그렇게 느낄 만큼 많이 힘들었겠어요.',
      '그 일이 마음에 오래 남았나 봐요.',
      '지금 마음이 꽤 지쳐 있었을 것 같아요.',
    ]);

    const result = await service.moderate({
      text: '그냥 네가 너무 예민한 거 아냐?',
      surface: 'reply',
    });

    expect(result.action).toBe('suggest_rewrite');
    expect(result.categories).toEqual(['emotion_dismissal', 'judgmental']);
    expect(result.suggestions).toEqual([
      '그렇게 느낄 만큼 많이 힘들었겠어요.',
      '그 일이 마음에 오래 남았나 봐요.',
      '지금 마음이 꽤 지쳐 있었을 것 같아요.',
    ]);
  });

  it('blocks obvious conflict, privacy, promotion, and high-risk advice without calling the classifier', async () => {
    const cases = [
      {
        text: '요즘 여자들은 다 그래.',
        categories: ['gender_conflict'],
      },
      {
        text: '그 정당 지지하는 사람들은 다 답이 없어.',
        categories: ['politics', 'division'],
      },
      {
        text: '카톡 아이디 줘.',
        categories: ['privacy'],
      },
      {
        text: '제 서비스 한번 써보세요.',
        categories: ['promotion'],
      },
      {
        text: '약 끊고 그냥 쉬면 괜찮아.',
        categories: ['high_risk_advice'],
      },
    ] as const;

    for (const item of cases) {
      const result = await service.moderate({
        text: item.text,
        surface: 'reply',
      });

      expect(result.action).toBe('block');
      expect(result.categories).toEqual(
        expect.arrayContaining(item.categories),
      );
      expect(result.suggestions).toEqual([]);
    }
    expect(classifier.classify).not.toHaveBeenCalled();
  });

  it('marks load-test traffic as excluded and skips LLM work', async () => {
    const result = await service.moderate({
      text: '[load-test:guest-abuse] 123456',
      surface: 'reply',
      metadata: { source: 'load_test' },
    });

    expect(result).toEqual({
      action: 'allow',
      reason: '부하테스트 트래픽은 학습/평가/통계에서 제외합니다.',
      categories: [],
      severity: 0,
      confidence: 1,
      suggestions: [],
      telemetry: {
        shouldPersistForTraining: false,
        excludedReason: 'load_test',
      },
    });
    expect(classifier.classify).not.toHaveBeenCalled();
    expect(rewriter.rewrite).not.toHaveBeenCalled();
  });

  it('returns uncertain instead of allow when classification fails', async () => {
    classifier.classify.mockRejectedValue(new Error('timeout'));

    const result = await service.moderate({
      text: '애매한 답장',
      surface: 'reply',
    });

    expect(result).toEqual({
      action: 'uncertain',
      reason: '답장 안전도 판정에 실패했습니다.',
      categories: [],
      severity: 0,
      confidence: 0,
      suggestions: [],
      telemetry: { shouldPersistForTraining: true },
    });
    expect(rewriter.rewrite).not.toHaveBeenCalled();
  });

  it('can include classifier errors in telemetry for eval diagnostics', async () => {
    classifier.classify.mockRejectedValue(new Error('timeout'));
    service = new ReplyContentModerationService(classifier, rewriter, {
      captureErrors: true,
    });

    const result = await service.moderate({
      text: '애매한 답장',
      surface: 'reply',
    });

    expect(result.telemetry).toEqual({
      shouldPersistForTraining: true,
      errorReason: 'timeout',
    });
  });

  it('keeps suggest_rewrite when rewrite generation fails', async () => {
    classifier.classify.mockResolvedValue({
      action: 'suggest_rewrite',
      reason: '해결책을 단정적으로 제시합니다.',
      categories: ['unsolicited_solution'],
      severity: 2,
      confidence: 0.82,
    });
    rewriter.rewrite.mockRejectedValue(new Error('timeout'));

    const result = await service.moderate({
      text: '그냥 잊어.',
      surface: 'reply',
    });

    expect(result).toEqual({
      action: 'suggest_rewrite',
      reason: '해결책을 단정적으로 제시합니다.',
      categories: ['unsolicited_solution'],
      severity: 2,
      confidence: 0.82,
      suggestions: [],
      telemetry: { shouldPersistForTraining: true },
    });
  });
});
