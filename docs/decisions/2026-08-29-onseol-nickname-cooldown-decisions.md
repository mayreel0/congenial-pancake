# 온설 닉네임 변경 쿨타임 결정 기록

## 배경

PR #97(닉네임 게시물 노출 프론트엔드) 리뷰 중 사용자 피드백 4가지:
1. 글쓰기/답장 폼의 체크박스 UI가 일반 체크박스라 마음에 안 듦 → 공용 토글 컴포넌트로 교체(나중에 설정 화면에서도 재사용 가능하게).
2. 닉네임 변경은 "내 기록" 흐름이 아니라 "내 정보" 섹션 안에 있어야 함.
3. 닉네임 변경 폼의 취소 버튼에도 secondary 테마를 적용.
4. 닉네임 변경에 쿨타임을 둘 수 있도록 할 것.

1~3은 UI 폴리시로 바로 진행했고, 4번(쿨타임)만 실제 트레이드오프가 있는 결정이라 진행 전 확인받음.

## 결정 1: 쿨타임 7일

옵션(24시간/7일/30일) 중 "7일(추천)"로 확정 — 도배/스팸 방지에 충분하면서 너무 불편하지 않은 일반적인 기간.

## 결정 2: 최초 설정은 예외

"아직 닉네임이 없던 사용자가 처음 설정하는 건 즉시 반영, 쿨타임은 그 다음 변경부터 적용"으로 확정. 구현: `users.nickname_changed_at`이 `NULL`이면(한 번도 안 바꿨으면) 쿨타임 체크를 건너뛰고 바로 허용 — 즉, 최초 설정 자체가 바로 "1번째 변경 시각"을 찍어서 그 다음 변경부터 7일 제한이 걸림.

## 산출물

- **백엔드**: `users.nickname_changed_at`(nullable timestamptz) 추가. `UsersService.updateNickname()`이 변경 전 쿨타임을 체크 — `nickname !== null && nicknameChangedAt`이 있고 7일 이내면 `NicknameCooldownException`(429, 한국어 메시지 — NicknameSection이 `error.message`를 그대로 보여주므로). `UserResponseDto`에 `nicknameChangeAvailableAt`(다음 변경 가능 시각, ISO — 아직 쿨타임 없으면 `null`, 지난 쿨타임이면 과거 시각) 추가해서 프론트가 실패를 겪기 전에 미리 버튼을 비활성화할 수 있게 함. 쿨타임 일수 상수는 `src/users/nickname-cooldown.constants.ts`에 한 곳에만 정의(서비스/DTO/예외 메시지가 공유) — 단, `common/exceptions`가 `users/` 기능 모듈에 의존하지 않도록 예외 메시지 자체엔 총 쿨타임 일수를 반복하지 않고 "남은 일수"만 표시.
- **프론트엔드**: `packages/ui`에 `Toggle` 컴포넌트 신규(네이티브 체크박스 + peer-checked로 스위치 스타일, 키보드/포커스 접근성은 그대로 유지) — `RequestComposer`/`AnswerComposer`의 raw `<input type="checkbox">`를 교체. `Button`에 `variant: "primary" | "secondary"` 추가, `NicknameSection`의 취소 버튼에 `secondary` 적용. `NicknameSection`을 `/me`의 "내 정보" 섹션(이메일/가입일이 있는 카드) 안으로 이동. `NicknameSection`이 `nicknameChangeAvailableAt`을 보고 쿨타임 중이면 "N일 후에 다시 바꿀 수 있어요."를 보여주고 "수정" 버튼을 비활성화.

## 검증

- `apps/api-server`: lint/typecheck/test(67/67, 신규 `users.service.spec.ts` 쿨타임 단위테스트 3개 포함)/build 통과. 마이그레이션 실제 적용.
- `apps/web`/`packages/ui`/`packages/api`: lint/typecheck/test(67/67)/build 통과. `apps/admin`/`apps/storybook-app`도 영향 없음 확인.
- 실브라우저 검증: `/me`에서 닉네임 변경(레거시 계정이라 `nicknameChangedAt`이 없어 최초 변경은 무료로 처리됨, 결정 2와 일치) → 즉시 "N일 후에 다시 바꿀 수 있어요." 표시 + "수정" 버튼 비활성화 확인. 토글 스위치가 실제로 스위치 모양으로 렌더링되고 클릭 시 상태가 바뀌는 것, 새 토글로 작성한 글이 `/read`에 실제 닉네임으로 정확히 표시되는 것까지 확인.

## 남은 일

- 기존에(이 컬럼이 생기기 전에) 닉네임을 이미 설정해둔 계정들은 `nicknameChangedAt`이 `NULL`이라 다음 변경이 무료로 처리됨 — 백필하지 않기로 함(의도적: 마이그레이션 시점의 사용자를 소급 제재할 이유가 없음).
