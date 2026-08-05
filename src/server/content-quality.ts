import { QualityLabel, QualityTargetType, VisibilityState } from "@prisma/client";

export type ContentQualityInput = {
  targetType: keyof typeof QualityTargetType;
  text: string;
};

export type ContentQualityDecision = {
  label: QualityLabel;
  score: number;
  reason: string;
};

const unsafePatterns = [/죽여버려|자살해|죽어버려|꺼져|병신|혐오/i];
const spamPatterns = [/구독|내 채널|광고|홍보|오픈채팅|카톡방|http/i];
const dismissivePatterns = [/그 정도로|별것도|유난|사회생활은 어떻게|그걸로.*힘들/i];
const sarcasticPatterns = [/대단하시네요\s*ㅋ|참 잘났|잘도 그러/i];

function compactText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function isRepeatedLowInformation(text: string) {
  const withoutSpaces = text.replace(/\s/g, "");
  if (withoutSpaces.length < 4) return true;
  if (/^(.)\1{5,}$/.test(withoutSpaces)) return true;
  if (/^[ㅋㅎㅠㅜ!?.,~]{6,}$/.test(withoutSpaces)) return true;
  return false;
}

export function evaluateContentQuality(input: ContentQualityInput): ContentQualityDecision {
  const text = compactText(input.text);

  if (isRepeatedLowInformation(text)) {
    return { label: QualityLabel.LOW_EFFORT, score: 65, reason: "low_information_text" };
  }
  if (unsafePatterns.some((pattern) => pattern.test(text))) {
    return { label: QualityLabel.UNSAFE, score: 95, reason: "unsafe_expression" };
  }
  if (spamPatterns.some((pattern) => pattern.test(text))) {
    return { label: QualityLabel.SPAM, score: 85, reason: "spam_or_promotion" };
  }
  if (dismissivePatterns.some((pattern) => pattern.test(text))) {
    return { label: QualityLabel.DISMISSIVE, score: 78, reason: "dismissive_tone" };
  }
  if (sarcasticPatterns.some((pattern) => pattern.test(text))) {
    return { label: QualityLabel.SARCASTIC, score: 78, reason: "sarcastic_tone" };
  }

  return { label: QualityLabel.ALLOWED, score: 0, reason: "allowed" };
}

export function qualityDecisionToVisibility(decision: ContentQualityDecision): VisibilityState {
  if (decision.score >= 90 || decision.label === QualityLabel.UNSAFE) return VisibilityState.HIDDEN;
  if (decision.score >= 75) return VisibilityState.HELD;
  if (decision.score >= 60) return VisibilityState.AUTHOR_ONLY;
  return VisibilityState.VISIBLE;
}
