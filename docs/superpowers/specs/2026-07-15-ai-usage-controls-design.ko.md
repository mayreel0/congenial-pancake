# AI 사용량 제한 및 관리자 토글 설계

## 목적

AI 칭찬 생성은 서비스가 커질수록 비용이 누적되기 쉽습니다. MVP 단계에서는 운영자가 앱 안에서 AI 칭찬을 켜고 끌 수 있고, 하루 실행량을 제한하며, 어떤 이유로 AI 작업이 실행되거나 건너뛰었는지 확인할 수 있어야 합니다.

이번 설계는 결제 연동, 정확한 토큰 과금 계산, 외부 분석 도구 연동 없이도 운영에 필요한 최소 방어선을 만드는 것을 목표로 합니다.

## 범위

포함합니다:

- 데이터베이스에 저장되는 AI 제어 설정.
- 하루 AI 작업 수와 생성 댓글 수 제한.
- 실행, 스킵, 실패를 기록하는 AI 사용량 이벤트.
- 기존 운영자 화면 안의 AI 제어 섹션.
- provider 호출 전 worker 정책 검사.
- 정책과 API 검증 단위 테스트.

이번 PR에서는 제외합니다:

- provider 청구 금액과 정확히 대조하는 정산 기능.
- 사용자별 유료 quota.
- provider 콘솔 budget alert 연동.
- 별도 관리자 대시보드 앱.

## 데이터 모델

`AiControlSetting` 모델을 추가합니다. 고정 id, 예를 들어 `global`, 을 사용하는 singleton row로 다룹니다.

필드:

- `id`: 문자열 primary key. 코드는 `global` row를 사용합니다.
- `enabled`: boolean, 기본값 `true`.
- `dailyJobLimit`: 정수, 기본값 `100`.
- `dailyCommentLimit`: 정수, 기본값 `300`.
- `createdAt`, `updatedAt`.

`AiUsageEvent` 모델을 추가합니다.

필드:

- `id`: 문자열 primary key.
- `jobId`: 선택적 AI 작업 id.
- `postId`: 선택적 글 id.
- `provider`: 예: `gemini`, `openai`.
- `model`: 사용 모델명.
- `status`: `RUN`, `SKIPPED`, `FAILED`.
- `reason`: `disabled`, `daily_job_limit`, `daily_comment_limit`, `completed`, `provider_error` 같은 안정적인 이유 문자열.
- `requestedComments`: 요청 댓글 수.
- `generatedComments`: 실제 생성 댓글 수.
- `estimatedPromptTokens`: 대략적인 prompt token 추정값.
- `estimatedResponseTokens`: 대략적인 response token 추정값.
- `createdAt`.

토큰 수는 텍스트 길이 기반 추정치입니다. 운영자가 흐름을 보는 용도이며, 청구 금액과 1:1로 맞추는 값은 아닙니다.

## 서버 정책

`src/server/ai-controls.ts` 모듈을 만들어 AI 비용 방어 정책의 경계로 삼습니다.

책임:

- singleton 설정을 읽거나 기본값으로 생성합니다.
- 현재 UTC 하루 범위를 계산합니다.
- 오늘의 AI 사용량 이벤트를 집계합니다.
- AI 작업이 provider를 호출해도 되는지 판단합니다.
- 스킵, 성공, 실패 후 사용량 이벤트를 기록합니다.
- prompt와 response token 사용량을 대략 추정합니다.

worker 흐름은 다음과 같습니다:

1. AI 작업과 글을 불러옵니다.
2. terminal 상태 확인 후 작업을 `RUNNING`으로 바꿉니다.
3. `canRunAiPraiseJob()`으로 provider 호출 가능 여부를 확인합니다.
4. 꺼져 있거나 제한 초과라면 작업을 `SKIPPED`로 바꾸고 `AiUsageEvent`를 기록합니다.
5. 허용되면 Gemini/OpenAI를 호출합니다.
6. 기존 글별 AI 댓글 cap 안에서 댓글을 만듭니다.
7. 생성 개수와 token 추정치를 기록합니다.
8. provider 생성이 실패하면 작업을 `FAILED`로 바꾸고 실패 이벤트를 기록한 뒤, BullMQ retry 동작을 보존하기 위해 에러를 다시 던집니다.

하루 댓글 제한은 provider 호출 전에 요청 댓글 수 기준으로 검사합니다. 실제 생성된 댓글 수는 usage event에 별도로 남깁니다.

## 운영자 UI 및 API

기존 `/moderation` 영역을 재사용합니다.

AI 제어 섹션에 표시합니다:

- 현재 AI 활성화 상태.
- 하루 작업 제한 입력.
- 하루 댓글 제한 입력.
- 오늘 실행 작업 수.
- 오늘 생성 AI 댓글 수.
- 오늘 스킵/실패 수.

moderator 전용 API route를 추가하거나 기존 moderation API에 명확히 분리된 action으로 설정 업데이트 기능을 붙입니다.

검증 규칙:

- 운영자만 AI 제어 설정을 읽고 수정할 수 있습니다.
- 제한값은 0부터 10000까지의 정수만 허용합니다.
- `enabled`는 boolean이어야 합니다.
- 제한값 0은 그날 작업 또는 댓글 생성을 허용하지 않는다는 의미입니다.

## 오류 처리

- 설정 row가 없으면 기본값으로 생성합니다.
- AI 비활성화 또는 quota 초과는 오류가 아니며 작업은 `SKIPPED`가 됩니다.
- provider 실패는 `FAILED` usage event로 남기고 기존 worker retry 동작을 유지합니다.
- 사용량 이벤트가 아직 없어도 UI는 현재 설정과 오늘 사용량 0을 보여야 합니다.

## 테스트

추가할 테스트:

- 기본 AI 제어 설정은 활성화되어 있고 보수적인 제한값을 가집니다.
- AI가 꺼져 있으면 provider 호출 전에 스킵됩니다.
- 오늘 실행 수가 하루 작업 제한에 도달하면 스킵됩니다.
- 요청 댓글 수가 하루 댓글 제한을 넘기면 스킵됩니다.
- 성공, 스킵, 실패 이유가 usage event로 기록됩니다.
- 운영자 API는 비운영자와 잘못된 제한값을 거부합니다.

기존 AI job 테스트는 계속 통과해야 합니다.

## 성공 기준

- 운영자가 앱에서 AI 생성을 끌 수 있습니다.
- 운영자가 하루 작업 수와 댓글 수 제한을 설정할 수 있습니다.
- 비활성화 또는 제한 초과 상태에서는 Gemini/OpenAI 호출이 발생하지 않습니다.
- 운영자가 오늘 AI 사용량을 운영자 화면에서 볼 수 있습니다.
- Gemini/OpenAI provider 전환 구조는 유지됩니다.
