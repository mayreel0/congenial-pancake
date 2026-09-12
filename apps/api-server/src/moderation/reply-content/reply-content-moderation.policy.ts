import type {
  ModerationCategory,
  ModerationExcludedReason,
  ModerationInput,
  ModerationResult,
} from './reply-content-moderation.types';

type HardBlockRule = {
  category: ModerationCategory;
  reason: string;
  patterns: RegExp[];
};

const HARD_BLOCK_RULES: HardBlockRule[] = [
  {
    category: 'gender_conflict',
    reason: '젠더 갈등을 조장하는 표현입니다.',
    patterns: [/요즘\s*(여자|남자)들은\s*다\s*그래/u],
  },
  {
    category: 'politics',
    reason: '정치 성향에 따른 갈등을 조장하는 표현입니다.',
    patterns: [
      /(정당|진보|보수|좌파|우파|민주당|국민의힘).*(지지하는\s*사람|지지자|찍은\s*사람).*(답이\s*없|멍청|한심|쓰레기)/u,
    ],
  },
  {
    category: 'division',
    reason: '집단을 나누어 비난하는 표현입니다.',
    patterns: [
      /(정당|진보|보수|좌파|우파|민주당|국민의힘).*(지지하는\s*사람|지지자|찍은\s*사람).*(답이\s*없|멍청|한심|쓰레기)/u,
    ],
  },
  {
    category: 'privacy',
    reason: '개인 연락처 또는 신상 공개를 유도하는 표현입니다.',
    patterns: [
      /(카톡|카카오톡|오픈채팅|전화번호|연락처|인스타|디엠|DM)\s*(아이디|줘|알려|남겨)/iu,
    ],
  },
  {
    category: 'promotion',
    reason: '홍보 또는 외부 서비스 유도 표현입니다.',
    patterns: [
      /(내|제)\s*(서비스|상품|채널|계정|링크).*(써보|들어와|방문|가입)/u,
    ],
  },
  {
    category: 'high_risk_advice',
    reason: '의료 등 고위험 조언을 단정적으로 제시합니다.',
    patterns: [/(약|처방|치료).*(끊고|중단하고|먹지\s*말고)/u],
  },
];

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function detectExcludedReason(
  input: ModerationInput,
): ModerationExcludedReason | undefined {
  if (input.metadata?.isLoadTest || input.metadata?.source === 'load_test') {
    return 'load_test';
  }

  if (input.metadata?.source === 'seed') return 'seed_data';
  if (input.metadata?.source === 'system') return 'system_generated';

  const normalized = normalizeText(input.text);
  if (
    /^\[load-test:[^\]]+\]/u.test(normalized) ||
    /^loadtest-/u.test(normalized)
  ) {
    return 'load_test';
  }

  return undefined;
}

export function excludedTrafficResult(
  excludedReason: ModerationExcludedReason,
): ModerationResult {
  const reasonByExcludedReason: Record<ModerationExcludedReason, string> = {
    load_test: '부하테스트 트래픽은 학습/평가/통계에서 제외합니다.',
    seed_data: '시드 데이터는 학습/평가/통계에서 제외합니다.',
    system_generated: '시스템 생성 데이터는 학습/평가/통계에서 제외합니다.',
  };

  return {
    action: 'allow',
    reason: reasonByExcludedReason[excludedReason],
    categories: [],
    severity: 0,
    confidence: 1,
    suggestions: [],
    telemetry: {
      shouldPersistForTraining: false,
      excludedReason,
    },
  };
}

export function evaluateHardBlock(
  input: ModerationInput,
): ModerationResult | undefined {
  const normalized = normalizeText(input.text);
  const categories = new Set<ModerationCategory>();
  const reasons: string[] = [];

  for (const rule of HARD_BLOCK_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      categories.add(rule.category);
      reasons.push(rule.reason);
    }
  }

  if (categories.size === 0) return undefined;

  return {
    action: 'block',
    reason: reasons[0],
    categories: [...categories],
    severity: 5,
    confidence: 1,
    suggestions: [],
    telemetry: { shouldPersistForTraining: true },
  };
}

export function normalizeSuggestions(suggestions: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const suggestion of suggestions) {
    const text = normalizeText(suggestion);
    if (!text || seen.has(text)) continue;

    seen.add(text);
    normalized.push(text);
    if (normalized.length === 3) break;
  }

  return normalized;
}
