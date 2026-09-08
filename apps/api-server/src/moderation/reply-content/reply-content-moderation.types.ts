export type ModerationAction =
  'allow' | 'suggest_rewrite' | 'block' | 'uncertain';

export type ModerationCategory =
  | 'profanity'
  | 'hate'
  | 'insult'
  | 'mockery'
  | 'contempt'
  | 'sarcasm'
  | 'emotion_dismissal'
  | 'judgmental'
  | 'unsolicited_solution'
  | 'division'
  | 'politics'
  | 'gender_conflict'
  | 'comparison_conflict'
  | 'privacy'
  | 'promotion'
  | 'spam'
  | 'sexual_harassment'
  | 'threat'
  | 'self_harm_encouragement'
  | 'illegal'
  | 'high_risk_advice';

export type ModerationExcludedReason =
  'load_test' | 'seed_data' | 'system_generated';

export type ModerationInput = {
  text: string;
  surface: 'reply';
  metadata?: {
    source?: 'user' | 'load_test' | 'seed' | 'admin' | 'system';
    isLoadTest?: boolean;
  };
};

export type ToneClassification = {
  action: ModerationAction;
  reason: string;
  categories: ModerationCategory[];
  severity: 0 | 1 | 2 | 3 | 4 | 5;
  confidence: number;
};

export type ModerationResult = ToneClassification & {
  suggestions: string[];
  telemetry: {
    shouldPersistForTraining: boolean;
    excludedReason?: ModerationExcludedReason;
    errorReason?: string;
  };
};

export interface ReplyToneClassifier {
  classify(input: ModerationInput): Promise<ToneClassification>;
}

export interface ReplyRewriter {
  rewrite(input: ModerationInput): Promise<string[]>;
}
