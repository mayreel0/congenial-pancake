import OpenAI from 'openai';
import { z } from 'zod';
import { normalizeSuggestions } from '../reply-content/reply-content-moderation.policy';
import type {
  ModerationCategory,
  ModerationInput,
  ReplyRewriter,
  ReplyToneClassifier,
  ToneClassification,
} from '../reply-content/reply-content-moderation.types';

type OpenAIResponse = {
  output_text?: string | null;
};

export type OpenAIResponsesClient = {
  responses: {
    create(body: Record<string, unknown>): Promise<OpenAIResponse>;
  };
};

export type OpenAIReplyModerationOptions = {
  model: string;
  timeoutMs: number;
};

export function createOpenAIResponsesClient(
  apiKey: string,
): OpenAIResponsesClient {
  return new OpenAI({ apiKey });
}

const moderationCategories = [
  'profanity',
  'hate',
  'insult',
  'mockery',
  'contempt',
  'sarcasm',
  'emotion_dismissal',
  'judgmental',
  'unsolicited_solution',
  'division',
  'politics',
  'gender_conflict',
  'comparison_conflict',
  'privacy',
  'promotion',
  'spam',
  'sexual_harassment',
  'threat',
  'self_harm_encouragement',
  'illegal',
  'high_risk_advice',
] as const satisfies readonly ModerationCategory[];

const toneClassificationSchema = z.object({
  action: z.enum(['allow', 'suggest_rewrite', 'block', 'uncertain']),
  reason: z.string().min(1),
  categories: z.array(z.enum(moderationCategories)),
  severity: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  confidence: z.number().min(0).max(1),
});

const rewriteSchema = z.object({
  suggestions: z.array(z.string()),
});

const toneClassificationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'reason', 'categories', 'severity', 'confidence'],
  properties: {
    action: {
      type: 'string',
      enum: ['allow', 'suggest_rewrite', 'block', 'uncertain'],
    },
    reason: { type: 'string' },
    categories: {
      type: 'array',
      items: { type: 'string', enum: moderationCategories },
    },
    severity: { type: 'integer', enum: [0, 1, 2, 3, 4, 5] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
};

const rewriteJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions'],
  properties: {
    suggestions: {
      type: 'array',
      minItems: 0,
      maxItems: 3,
      items: { type: 'string' },
    },
  },
};

function parseOutputText(response: OpenAIResponse): unknown {
  if (!response.output_text) {
    throw new Error('OpenAI reply moderation returned no output_text');
  }

  return JSON.parse(response.output_text);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error('OpenAI reply moderation timed out'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeout),
  );
}

function baseInput(input: ModerationInput): string {
  return [
    '다음은 온설 서비스에 등록하려는 짧은 답장입니다.',
    '비난, 조롱, 혐오, 갈등 조장, 개인정보 유도, 홍보, 고위험 조언을 피해야 합니다.',
    '해결책을 단정적으로 제시하기보다 짧고 담백하게 공감하는 답장만 허용합니다.',
    '',
    input.text,
  ].join('\n');
}

export class OpenAIReplyToneClassifier implements ReplyToneClassifier {
  constructor(
    private readonly client: OpenAIResponsesClient,
    private readonly options: OpenAIReplyModerationOptions,
  ) {}

  async classify(input: ModerationInput): Promise<ToneClassification> {
    const response = await withTimeout(
      this.client.responses.create({
        model: this.options.model,
        input: baseInput(input),
        text: {
          format: {
            type: 'json_schema',
            name: 'onseol_reply_tone_classification',
            strict: true,
            schema: toneClassificationJsonSchema,
          },
        },
      }),
      this.options.timeoutMs,
    );

    return toneClassificationSchema.parse(parseOutputText(response));
  }
}

export class OpenAIReplyRewriter implements ReplyRewriter {
  constructor(
    private readonly client: OpenAIResponsesClient,
    private readonly options: OpenAIReplyModerationOptions,
  ) {}

  async rewrite(input: ModerationInput): Promise<string[]> {
    const response = await withTimeout(
      this.client.responses.create({
        model: this.options.model,
        input: [
          baseInput(input),
          '',
          '온설에 맞는 대안 답장을 1개에서 3개까지 제안하세요.',
          '각 문장은 짧고 담백해야 하며, 해결책을 지시하지 않아야 합니다.',
        ].join('\n'),
        text: {
          format: {
            type: 'json_schema',
            name: 'onseol_reply_rewrite_suggestions',
            strict: true,
            schema: rewriteJsonSchema,
          },
        },
      }),
      this.options.timeoutMs,
    );

    return normalizeSuggestions(
      rewriteSchema.parse(parseOutputText(response)).suggestions,
    );
  }
}
