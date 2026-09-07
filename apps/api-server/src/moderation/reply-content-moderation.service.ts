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
): ModerationResult {
  return {
    ...classification,
    suggestions: normalizeSuggestions(suggestions),
    telemetry: { shouldPersistForTraining: true },
  };
}

export class ReplyContentModerationService {
  constructor(
    private readonly classifier: ReplyToneClassifier,
    private readonly rewriter: ReplyRewriter,
  ) {}

  async moderate(input: ModerationInput): Promise<ModerationResult> {
    const excludedReason = detectExcludedReason(input);
    if (excludedReason) return excludedTrafficResult(excludedReason);

    const hardBlock = evaluateHardBlock(input);
    if (hardBlock) return hardBlock;

    let classification: ToneClassification;
    try {
      classification = await this.classifier.classify(input);
    } catch {
      return {
        action: 'uncertain',
        reason: '답장 안전도 판정에 실패했습니다.',
        categories: [],
        severity: 0,
        confidence: 0,
        suggestions: [],
        telemetry: { shouldPersistForTraining: true },
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
    } catch {
      return toResult(classification);
    }
  }
}
