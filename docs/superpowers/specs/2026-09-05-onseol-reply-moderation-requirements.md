---
title: Onseol Reply Moderation Requirements
date: 2026-09-05
status: draft
scope: apps/api-server/src/moderation internal reply pre-submit moderation engine
---

# 온설 답장 사전 moderation 요구사항

## 목적

온설은 짧은 위로 요청과 담백한 답장을 주고받는 서비스다. 이 문서는 답장이 등록되기 전에 온설의 대화 원칙에 맞는지 판정하고, 필요하면 더 온설다운 문장으로 다시 쓸 수 있게 돕는 moderation 엔진의 요구사항을 정리한다.

이 기능은 사용자를 처벌하거나 표현을 과하게 검열하는 장치가 아니라, 상대에게 닿는 답장이 비난, 비판, 조롱, 멸시, 혐오, 질투, 갈등 조장 없이 머물도록 돕는 안전 계층이다.

## 범위

이번 범위는 `apps/api-server/src/moderation` 내부의 답장 사전 검사 엔진이다.

포함한다:

- 답장 본문을 `allow`, `suggest_rewrite`, `block`, `uncertain` 중 하나로 판정한다.
- 명확한 차단 규칙과 온설식 문맥 판정을 함께 사용한다.
- 필요하면 짧고 담백한 비해결형 공감 문장 1-3개를 제안한다.
- LLM 실패, 부하테스트/시드 데이터 제외, provider 교체 가능성을 요구사항에 반영한다.
- 테스트 fixture와 평가 기준을 정의할 수 있는 구조를 둔다.

포함하지 않는다:

- `RepliesService.create()` 연결
- 답장 등록 API 응답 형식 변경
- 프론트엔드 제안 UI
- DB 스키마 변경
- 관리자 화면 변경
- 배포/인프라 변경
- 별도 moderation 서버 구축
- EC2 또는 개인 PC의 운영용 Ollama/로컬 LLM 서빙

## 위로 요청과 답장 경계

위로 요청과 답장은 같은 moderation 정책을 적용하지 않는다.

- 위로 요청은 필터링보다 작성 보조 대상이다.
- 위로 요청에는 감정 키워드, 상황 태그, 받고 싶은 위로 유형 등을 통해 사용자가 글을 더 쉽게 쓰도록 돕는 방향이 적합하다.
- 답장은 다른 사람에게 직접 닿는 말이므로 사전 moderation 대상이다.

이 문서는 답장 moderation만 다룬다.

## 답장 스타일 원칙

온설식 답장은 짧고 담백한 비해결형 공감이다.

- 짧고 담백하게 공감한다.
- 상대의 감정을 판단하지 않는다.
- 해결책을 제시하지 않는다.
- 좋은 말로 과하게 포장하지 않는다.
- 비교하거나 훈계하지 않는다.
- 상대의 감정을 작게 만들지 않는다.
- 곁에 있다는 느낌만 남긴다.

예시:

| 원문 | 온설식 제안 |
| --- | --- |
| 그냥 신경 쓰지 마. 다 지나가. | 많이 마음 쓰였겠어요. 지금은 잠깐 내려놓아도 괜찮아요. |
| 너무 예민하게 생각하는 거 아니야? | 그렇게 느낄 만큼 많이 힘들었겠어요. |
| 힘내면 괜찮아질 거야. | 지금 버티는 것만으로도 충분히 애쓰고 있어요. |

## 판정 결과

모든 판정은 동일한 결과 형태를 가진다.

```ts
type ModerationAction =
  | "allow"
  | "suggest_rewrite"
  | "block"
  | "uncertain";

type ModerationCategory =
  | "profanity"
  | "hate"
  | "insult"
  | "mockery"
  | "contempt"
  | "sarcasm"
  | "emotion_dismissal"
  | "judgmental"
  | "unsolicited_solution"
  | "division"
  | "politics"
  | "gender_conflict"
  | "comparison_conflict"
  | "privacy"
  | "promotion"
  | "spam"
  | "sexual_harassment"
  | "threat"
  | "self_harm_encouragement"
  | "illegal"
  | "high_risk_advice";

type ModerationExcludedReason =
  | "load_test"
  | "seed_data"
  | "system_generated";

type ModerationResult = {
  action: ModerationAction;
  reason: string;
  categories: ModerationCategory[];
  severity: 0 | 1 | 2 | 3 | 4 | 5;
  confidence: number;
  suggestions: string[];
  telemetry: {
    shouldPersistForTraining: boolean;
    excludedReason?: ModerationExcludedReason;
  };
};
```

기본 의미:

- `allow`: 그대로 등록 가능한 답장
- `suggest_rewrite`: 차단할 정도는 아니지만 온설답게 다시 쓰도록 제안할 답장
- `block`: 등록할 수 없는 답장
- `uncertain`: 판정 실패 또는 낮은 확신으로 인해 자동 허용하지 않는 답장

`suggestions`는 1-3개를 반환한다. 기본 목표는 3개지만, 자연스럽지 않은 문장을 억지로 채우지 않는다.

## 차단 기준

아래에 해당하는 답장은 `block` 대상이다.

- 명백한 욕설, 모욕, 인신공격
- 혐오 표현
- 조롱, 멸시, 비하
- 위협, 자해/타해 조장
- 성적 모욕 또는 성희롱성 표현
- 갈라치기와 집단 간 적대 유도
- 정치 논쟁 또는 정치적 선동
- 남녀갈등, 젠더 갈등 조장
- 학벌, 직업, 소득, 지역, 외모, 나이 등 비교 갈등
- 개인정보 또는 신상 공개
- 홍보, 광고, 스팸, 외부 유도
- 종교 갈등 또는 포교성 표현
- 특정 커뮤니티/집단 낙인찍기
- 피해자 탓하기
- 가스라이팅성 표현
- 반복 도배
- 만남 유도, 연락처 교환 유도
- 의료, 법률, 투자 등 고위험 조언 단정
- 범죄 또는 불법행위 권유
- AI/봇처럼 무성의한 대량 답변

`block`은 두 축으로 판단한다.

- 상대를 해치는 말은 차단한다.
- 온설을 논쟁장, 홍보장, 위험 조언장으로 바꾸는 말도 차단한다.

## 다시쓰기 제안 기준

아래에 해당하는 답장은 차단보다 `suggest_rewrite`를 우선한다.

- 차갑거나 무심한 말
- 감정 축소
- 원치 않는 해결책 제시
- 비꼼으로 의심되는 표현
- 평가하거나 단정하는 말
- 위로 의도는 있으나 표현이 온설답지 않은 말

예시:

| 입력 | 기대 action | 이유 |
| --- | --- | --- |
| 너무 예민한 거 아니야? | suggest_rewrite | 감정을 축소하고 판단함 |
| 그냥 잊어. | suggest_rewrite | 해결을 단정적으로 제시함 |
| 다들 그렇게 살아. | suggest_rewrite | 고통을 일반화하고 축소함 |
| 요즘 여자들은 다 그래. | block | 젠더 갈등 조장 |
| 카톡 아이디 줘. | block | 연락처 교환 유도 |
| 내 서비스 한번 써보세요. | block | 홍보/외부 유도 |

## 처리 흐름

필터링 엔진은 LLM 하나에 판단을 전부 맡기지 않는다. 규칙, 패턴, LLM, 정책 결정을 분리한다.

```text
답장 입력
  -> 전처리
  -> 명확한 차단 규칙 검사
  -> 개인정보/홍보/스팸/갈등 주제 패턴 검사
  -> LLM 또는 classifier로 어감/의도 판정
  -> 정책 엔진이 최종 action 결정
  -> 필요하면 suggestions 1-3개 생성
  -> 결과 반환
```

명확한 규칙 차단은 LLM 호출 없이 처리한다. LLM classifier는 비꼼, 감정 축소, 판단, 해결 강요처럼 단어 목록만으로 판단하기 어려운 문맥을 판정한다. rewrite는 `suggest_rewrite` 또는 `uncertain` 계열에서만 호출한다.

## LLM provider

v1 provider는 OpenAI로 한다.

- 1차 hard safety: OpenAI Moderation API
- 2차 온설식 문맥 판정: `gpt-5-mini`
- 3차 suggestions 생성: `gpt-5-mini`
- 비용 절감 실험 후보: classifier에 한해 `gpt-5-nano` 비교

운영 원칙:

- EC2에 Ollama/로컬 LLM을 올리지 않는다.
- 개인 PC의 Ollama 실험은 가능하지만 v1 운영 범위가 아니다.
- provider 교체 가능성을 위해 classifier/rewriter adapter 경계를 둔다.

```ts
interface ReplyToneClassifier {
  classify(input: ModerationInput): Promise<ToneClassification>;
}

interface ReplyRewriter {
  rewrite(input: ModerationInput): Promise<string[]>;
}
```

## 타임아웃과 실패 처리

LLM 호출은 사용자 요청 경로에 있으므로 짧은 타임아웃을 둔다.

- classifier 권장 타임아웃: 3초
- rewrite 권장 타임아웃: 5초
- classifier 실패/타임아웃: `uncertain` 반환
- rewrite 실패/타임아웃: `suggestions: []` 반환
- 실패 시 자동 `allow`하지 않는다.

## 부하테스트와 비프로덕트성 데이터 제외

k6 부하테스트, 시드 데이터, 시스템 생성 데이터는 moderation 학습 데이터와 운영 품질 지표에서 제외한다.

현재 `tools/load-test`는 다음 식별 신호를 가진다.

- 시드 데이터 이메일/guest_id는 `loadtest-` 접두사를 사용한다.
- k6가 만드는 답장 본문은 `[load-test:*]` 패턴을 포함한다.
- 일부 capacity 시나리오는 `x-load-test-bypass` 헤더를 사용한다.

moderation 엔진은 백엔드에서 전달받은 metadata로 비프로덕트성 트래픽을 구분할 수 있어야 한다.

```ts
type ModerationInput = {
  text: string;
  surface: "reply";
  metadata?: {
    source?: "user" | "load_test" | "seed" | "admin" | "system";
    isLoadTest?: boolean;
  };
};
```

판별 우선순위:

1. 명시적 `metadata.source === "load_test"`
2. 백엔드가 감지한 `x-load-test-bypass` 헤더
3. `guest_id`, email, body prefix의 `loadtest-` 또는 `[load-test:*]` 패턴

부하테스트 중에는 LLM classifier/rewrite 호출을 생략할 수 있어야 한다. 이 경우 deterministic test result 또는 `allow`를 반환해 API/DB 성능 측정이 외부 LLM 지연과 비용에 의해 왜곡되지 않게 한다.

## 학습/평가 데이터 원칙

서비스 운영 데이터와 moderation 학습/평가 데이터는 구분한다.

- 답장 원문은 서비스 운영 데이터로 저장될 수 있다.
- 원문을 moderation 학습용 로그로 별도 복제하는 것은 v1에서 하지 않거나 최소화한다.
- 학습/평가 목적 저장은 별도 정책과 사용자 보호 기준이 정해진 뒤 진행한다.
- 부하테스트, seed, system 데이터는 학습/평가/통계 대상에서 제외한다.

자체 classifier는 v1 범위가 아니다. 나중에 다음 순서로 검토한다.

1. 정책 라벨 정의
2. 서비스 데이터, 직접 만든 예시, 공개 데이터셋, 합성 데이터 수집
3. 사람이 일부 검수
4. 테스트셋 고정
5. 오프라인 학습 또는 분류기 실험
6. shadow mode로 운영 결과와 비교
7. 명확한 allow/block 일부만 자체 classifier로 대체

## 테스트 fixture 초안

요구사항 구현 시 최소한 아래 예시를 fixture로 포함한다.

| 입력 | 기대 action | categories |
| --- | --- | --- |
| 많이 힘들었겠어요. | allow | [] |
| 여기까지 말해준 것만으로도 충분해요. | allow | [] |
| 그냥 잊어. | suggest_rewrite | ["unsolicited_solution"] |
| 너무 예민한 거 아니야? | suggest_rewrite | ["emotion_dismissal", "judgmental"] |
| 다들 그렇게 살아. | suggest_rewrite | ["emotion_dismissal"] |
| 그건 네 잘못이지. | block | ["insult", "judgmental"] |
| 요즘 여자들은 다 그래. | block | ["gender_conflict"] |
| 어느 학교 나왔길래 그래? | block | ["comparison_conflict"] |
| 카톡 아이디 줘. | block | ["privacy"] |
| 제 서비스 한번 써보세요. | block | ["promotion", "spam"] |
| 약 끊고 그냥 쉬면 괜찮아. | block | ["high_risk_advice"] |
| [load-test:guest-abuse] 123456 | allow | [] |

마지막 load-test 예시는 학습/평가/운영 품질 지표에서 제외되어야 한다.

## 후속 작업

- 이 요구사항을 기준으로 moderation 내부 구현 계획을 작성한다.
- API 연결, 프론트 UI, DB 저장, 운영 로그 수집은 별도 요구사항/계획으로 분리한다.
- 실제 테스트셋을 확장하면서 `block`과 `suggest_rewrite` 경계를 조정한다.
