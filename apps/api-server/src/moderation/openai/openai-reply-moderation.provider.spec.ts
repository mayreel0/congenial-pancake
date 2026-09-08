import {
  createOpenAIResponsesClient,
  OpenAIReplyRewriter,
  OpenAIReplyToneClassifier,
} from './openai-reply-moderation.provider';

type FakeOpenAIClient = {
  responses: {
    create: jest.Mock<
      Promise<{ output_text?: string | null }>,
      [Record<string, unknown>]
    >;
  };
};

function makeClient(): FakeOpenAIClient {
  return {
    responses: {
      create: jest.fn<
        Promise<{ output_text?: string | null }>,
        [Record<string, unknown>]
      >(),
    },
  };
}

describe('createOpenAIResponsesClient', () => {
  it('creates an SDK client with the Responses API surface', () => {
    const client = createOpenAIResponsesClient('sk-test-key');

    expect(typeof client.responses.create).toBe('function');
  });
});

describe('OpenAIReplyToneClassifier', () => {
  it('maps structured OpenAI output to a tone classification', async () => {
    const client = makeClient();
    client.responses.create.mockResolvedValue({
      output_text: JSON.stringify({
        action: 'suggest_rewrite',
        reason: '상대의 감정을 예민함으로 판단하고 축소합니다.',
        categories: ['emotion_dismissal', 'judgmental'],
        severity: 2,
        confidence: 0.86,
      }),
    });
    const classifier = new OpenAIReplyToneClassifier(client, {
      model: 'gpt-5-mini',
      timeoutMs: 3000,
    });

    await expect(
      classifier.classify({
        text: '그냥 네가 너무 예민한 거 아냐?',
        surface: 'reply',
      }),
    ).resolves.toEqual({
      action: 'suggest_rewrite',
      reason: '상대의 감정을 예민함으로 판단하고 축소합니다.',
      categories: ['emotion_dismissal', 'judgmental'],
      severity: 2,
      confidence: 0.86,
    });

    expect(client.responses.create).toHaveBeenCalledTimes(1);
    const request = client.responses.create.mock.calls[0][0];
    const text = request.text as {
      format?: { type?: unknown; name?: unknown };
    };
    expect(request.model).toBe('gpt-5-mini');
    expect(text.format?.type).toBe('json_schema');
    expect(text.format?.name).toBe('onseol_reply_tone_classification');
  });

  it('rejects when classification exceeds the timeout', async () => {
    jest.useFakeTimers();
    const client = makeClient();
    client.responses.create.mockReturnValue(new Promise(() => undefined));
    const classifier = new OpenAIReplyToneClassifier(client, {
      model: 'gpt-5-mini',
      timeoutMs: 3000,
    });

    const result = classifier.classify({
      text: '애매한 답장',
      surface: 'reply',
    });
    jest.advanceTimersByTime(3000);

    await expect(result).rejects.toThrow('OpenAI reply moderation timed out');
    jest.useRealTimers();
  });
});

describe('OpenAIReplyRewriter', () => {
  it('returns at most three normalized Onseol-style suggestions', async () => {
    const client = makeClient();
    client.responses.create.mockResolvedValue({
      output_text: JSON.stringify({
        suggestions: [
          '  많이 힘들었겠어요.  ',
          '많이 힘들었겠어요.',
          '그 마음이 오래 남았나 봐요.',
          '지금 꽤 지쳐 있었을 것 같아요.',
          '이건 네 번째라 제외됩니다.',
        ],
      }),
    });
    const rewriter = new OpenAIReplyRewriter(client, {
      model: 'gpt-5-mini',
      timeoutMs: 5000,
    });

    await expect(
      rewriter.rewrite({
        text: '그냥 잊어.',
        surface: 'reply',
      }),
    ).resolves.toEqual([
      '많이 힘들었겠어요.',
      '그 마음이 오래 남았나 봐요.',
      '지금 꽤 지쳐 있었을 것 같아요.',
    ]);
  });
});
