# apps/web 프론트엔드 폼에 zod 검증 연결

## 배경

PR #115(zod 마이그레이션 라운드, `docs/decisions/2026-09-01-onseol-zod-validation-migration-decisions.md`)에서 백엔드 21개 DTO를 전부 zod 스키마로 옮기면서, `packages/shared/src/dto.ts`에 요청-검증용 스키마 10개(`signupSchema`/`loginSchema`/`resetPasswordSchema`/`updateNicknameSchema`/`updateProfileVisibilitySchema`/`createRequestSchema`/`createReplySchema`/`createReportSchema`/`updateSettingsSchema`/`issuePasswordResetLinkSchema`)가 이미 존재한다. 그런데 `apps/web`은 지금 이 스키마들을 `import type`으로 타입만 가져다 쓰고, 실제 검증(런타임)은 폼마다 없거나 네이티브 HTML 속성(`required`/`minLength`/`maxLength`/`type="email"`)뿐이다. 이번 라운드는 그 회차의 "남은 일"로 명시적으로 미뤄뒀던 작업 — 기존 스키마를 실제 폼 검증에 연결한다.

`apps/web`만 대상으로 한다 — `apps/admin`도 같은 문제가 있지만(로그인/계정 폼/설정 폼), 이번 라운드에서는 다루지 않고 다음 라운드로 미룬다.

## 설계 결정

### 검증 타이밍: 제출 + blur, "touched" 이후엔 실시간

AskUserQuestion으로 제출 시점만 vs blur 시점도 포함 vs 실시간을 물었고, 사용자가 "제출이랑 blur 둘 다 필요하지 않나?"로 확정. 구체적으로는:
- 필드가 아직 한 번도 안 건드려졌으면(untouched) 에러를 안 보여줌.
- 제출을 시도하면 모든 필드가 한 번에 touched 처리됨.
- 개별 필드에서 blur가 발생하면 그 필드만 touched 처리됨.
- 일단 touched된 필드는 그 이후 값이 바뀔 때마다(매 keystroke) 에러가 즉시 재계산됨 — 사용자가 방금 지적된 문제를 고치면 다음 blur/제출을 기다리지 않고 바로 에러가 사라짐. (이 부분은 "touched 이후 실시간 갱신"이 blur/제출 검증의 자연스러운 완성형이라 판단해 추가로 결정 — 안 그러면 고친 후에도 에러가 남아있는 게 이상해 보임.)

### 대상 폼과 스키마 매핑

| 폼 | 파일 | 스키마 |
|---|---|---|
| 로그인/회원가입 | `app/login/page.tsx` | `loginSchema`/`signupSchema` |
| `/today` 고민 작성 | `app/today/components/RequestComposer.tsx` | `createRequestSchema` |
| `/today` 답변(즉석) | `app/today/components/ReplyComposer.tsx` | `createReplySchema` |
| `/answer` 답변 작성 | `app/answer/components/AnswerComposer.tsx` | `createReplySchema` |
| `/me` 닉네임 수정 | `app/me/components/NicknameSection.tsx` | `updateNicknameSchema` |
| 비밀번호 재설정 | `app/reset-password/ResetPasswordBody.tsx` | `resetPasswordSchema` |

`createReportSchema`/`updateProfileVisibilitySchema`는 텍스트 입력 폼이 아니라 버튼/토글로 동작하므로 대상에서 제외(잘못된 값 자체가 UI상 발생할 수 없음). `updateSettingsSchema`/`issuePasswordResetLinkSchema`는 `apps/admin` 소관이라 이번 범위 밖.

### 기존 `maxLength`(160/180)는 그대로 둠

`createRequestSchema`/`createReplySchema`는 `body`를 최대 500자까지 허용하는데, `RequestComposer`/`ReplyComposer`/`AnswerComposer`는 지금 각각 `maxLength={160}`/`{180}`으로 이미 그보다 타이트하게 막고 있다. 500으로 올려서 스키마와 UI 상한을 맞추는 것도 가능하지만, 그러면 실제로 입력 가능한 글자 수가 크게 늘어나는 별개의 제품 결정이 된다 — 이번 라운드는 "이미 있는 검증을 연결하는" 스코프이므로 기존 UI 상한은 건드리지 않는다. 스키마는 `min(1)`(빈 값 방지)과 향후 추가될 수 있는 다른 규칙(아래 "확장성" 참고)의 실행 지점으로 쓰인다.

### 확장성 — 나중에 비속어 필터링/문맥 기반 필터링이 추가돼도 괜찮은지

사용자 질문으로 확인: 필드 조건이나 비속어 필터링, 문맥(성향) 기반 필터링이 나중에 추가돼도 이 설계가 막지 않는다.
- 순수 구조적 규칙(길이/정규식/금지 문자열 등)은 `packages/shared/src/dto.ts` 스키마에 `.refine()`으로 추가하면, 프론트 코드 변경 없이 `parseFieldErrors`가 그대로 반영함(스키마를 통째로 돌리는 방식이라).
- 비속어 단어 리스트 필터링도 스키마에 넣을 수 있지만, 클라이언트 번들에 리스트가 노출/우회 가능해진다는 트레이드오프가 있어 백엔드 전용으로 두는 편이 나을 수도 있음 — 그때 가서 판단.
- 문맥/성향 기반(LLM) 필터링은 애초에 동기적 폼 검증의 영역이 아님 — 서버 모델 호출이 필요하므로, 기존 신고/모더레이션 패턴(자동 숨김 + 어드민 검토)이나 제출 시 API 에러로 처리될 가능성이 높고, 둘 다 지금 이미 있는 에러 처리 흐름(`ApiError` → 한국어 메시지 매핑)으로 자연스럽게 흡수됨.

## 계획된 구현

### 공용 유틸 (신규)

- `apps/web/app/lib/zod-form.ts` — `parseFieldErrors(schema, values)`: `schema.safeParse(values)` 실행 후 필드별 첫 에러 메시지만 뽑아 `{ [field]: message }` 형태로 반환. 유효하면 `{}`.
- `apps/web/app/lib/useFieldValidation.ts` — touched 상태를 관리하는 훅. `touch(field)`(blur용), `touchAll(fields)`(제출용), `visibleError(field, errors)`(touched된 필드만 에러 문자열 반환, 아니면 `undefined`) 제공. 6개 폼이 동일한 패턴을 반복하므로 공용화 — 이미 알려진 "6곳 다 똑같은 모양"이라 지금 추출하는 게 나중에 따로 빼는 것보다 낫다고 판단(`[[feature_then_extract_shared_component]]`의 반대 케이스: 두 번째 사용처를 기다릴 필요 없이 이미 6곳이 확정돼 있음).

### `packages/ui`의 `TextField`

`error?: string` prop 추가 — 입력창 아래 빨간 텍스트로 렌더링, `aria-invalid`/`aria-describedby`로 접근성 연결. `RequestComposer`/`ReplyComposer`/`AnswerComposer`의 `<textarea>`는 `TextField`를 쓰지 않으므로(입력창 타입이 다름) 각자 로컬로 동일한 스타일의 에러 텍스트를 추가.

### PR 분리

이번 라운드는 백엔드 변경이 없으므로(스키마는 이미 있음) 문서 → 프론트엔드 2개 PR로 진행. `v1` 기반, 순차.

## 검증

구현 전 계획 문서라 아직 없음 — 프론트엔드 PR이 머지된 뒤 이 문서에 추가 예정.
