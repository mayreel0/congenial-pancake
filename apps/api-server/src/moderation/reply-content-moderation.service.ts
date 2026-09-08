import {
  detectExcludedReason,
  evaluateHardBlock,
  excludedTrafficResult,
  normalizeSuggestions,
} from './reply-content-moderation.policy';
import type {
  ModerationInput,
  ModerationResult,
  ReplyRewriter,
  ReplyToneClassifier,
  ToneClassification,
} from './reply-content-moderation.types';

export type ReplyContentModerationServiceOptions = {
  captureErrors?: boolean;
};

export type {
  ModerationAction,
  ModerationCategory,
  ModerationExcludedReason,
  ModerationInput,
  ModerationResult,
  ReplyRewriter,
  ReplyToneClassifier,
  ToneClassification,
} from './reply-content-moderation.types';

function toResult(
  classification: ToneClassification,
  suggestions: string[] = [],
  errorReason?: string,
): ModerationResult {
  return {
    ...classification,
    suggestions: normalizeSuggestions(suggestions),
    telemetry: {
      shouldPersistForTraining: true,
      ...(errorReason ? { errorReason } : {}),
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class ReplyContentModerationService {
  constructor(
    private readonly classifier: ReplyToneClassifier,
    private readonly rewriter: ReplyRewriter,
    private readonly options: ReplyContentModerationServiceOptions = {},
  ) {}

  async moderate(input: ModerationInput): Promise<ModerationResult> {
    const excludedReason = detectExcludedReason(input);
    if (excludedReason) return excludedTrafficResult(excludedReason);

    const hardBlock = evaluateHardBlock(input);
    if (hardBlock) return hardBlock;

    let classification: ToneClassification;
    try {
      classification = await this.classifier.classify(input);
    } catch (error) {
      return {
        action: 'uncertain',
        reason: '답장 안전도 판정에 실패했습니다.',
        categories: [],
        severity: 0,
        confidence: 0,
        suggestions: [],
        telemetry: {
          shouldPersistForTraining: true,
          ...(this.options.captureErrors
            ? { errorReason: errorMessage(error) }
            : {}),
        },
      };
    }

    if (
      classification.action === 'allow' ||
      classification.action === 'block'
    ) {
      return toResult(classification);
    }

    try {
      return toResult(classification, await this.rewriter.rewrite(input));
    } catch (error) {
      return toResult(
        classification,
        [],
        this.options.captureErrors ? errorMessage(error) : undefined,
      );
    }
  }
}
