# 온설 OAuth 계정 비밀번호 부여 결정 기록

## 배경

`#88`(카카오/네이버 강제 재인증) 머지 후, 사용자가 실제 계정으로 카카오/네이버 로그인 테스트를 마쳤다고 확인하며 다음 작업으로 넘어가도 좋다고 했다. 다음 후보를 물으니(AskUserQuestion) "apps/admin OAuth 단독 로그인 지원"을 선택했는데, 이유를 물어보니 "관리자 계정이 OAuth 로그인 된 계정이라서" — 즉 실제로 필요한 건 apps/admin에 OAuth 버튼 3종을 추가하는 게 아니라, 그 특정 관리자 계정 하나에 비밀번호를 달아주는 훨씬 좁은 문제였다.

## 결정 1: apps/admin에 OAuth를 붙이지 않고, 관리자 계정에 비밀번호를 부여한다

`apps/admin`의 화이트리스트 게이트(`ADMIN_USER_IDS`)는 로그인 방식과 무관하게 user id만 본다 — 즉 admin 계정이 OAuth 전용이 아니라 비밀번호도 갖고 있으면 문제 자체가 사라진다. apps/admin에 OAuth 버튼 3개를 새로 붙이는 것보다 범위가 훨씬 작다는 점을 안내했고 사용자가 동의했다.

## 결정 2: 이메일 발송 없이, admin에서 링크를 바로 보여주는 방식

사용자가 "이메일로 링크 받는 방식"을 제안했다. 실제로는 표준적인 비밀번호 재설정 토큰 패턴(임의 토큰 발급 → DB에 sha256 해시로 저장(만료시간 포함) → 그 링크로 들어가면 새 비밀번호 설정)이 맞는 방향이었지만, 이메일 발송 인프라(SMTP 등)가 이 프로젝트에 전혀 없고 대상이 관리자 본인 계정 하나뿐이라, 이메일 전송 대신 `apps/admin`의 새 "계정" 탭에서 토큰 발급 시 링크를 그 자리에서 보여주고 관리자가 직접 복사해서 여는 방식으로 단순화했다 — 사용자가 동의.

## 산출물

- `apps/api-server`: `password_reset_tokens` 테이블(마이그레이션 `0008_mushy_iron_man.sql`) — `userId`, `tokenHash`(sha256, bcrypt 아님 — DB에서 정확히 일치하는 값으로 조회해야 해서), `expiresAt`(30분, 관리자가 그 자리에서 바로 쓰는 용도라 이메일함에 오래 남아있을 필요가 없음), `usedAt`(재사용 방지).
  - `PasswordResetTokensRepository`/`PasswordResetService`(`src/auth/password-reset/`) — `issueLink(userId)`, `resetPassword(token, newPassword)`.
  - `AdminController`에 `POST /admin/users/password-reset-link`(이메일로 대상 조회 → 토큰 발급 → URL 반환) 추가 — 기존 `SessionGuard`+`AdminGuard` 체인 그대로 적용.
  - `AuthController`에 `POST /auth/reset-password`(공개, 토큰 자체가 인가 증명 — 세션 불필요) 추가, `/auth/login`/`/auth/signup`과 동일하게 5회/60초 스로틀링.
  - `UsersRepository`/`UsersService`에 `updatePasswordHash` 추가.
- `apps/web`: `/reset-password?token=...` 페이지(신규) — `useSearchParams()`를 쓰는 클라이언트 컴포넌트를 `Suspense`로 감싸 정적 렌더링 유지, 성공 시 로그인 페이지로 이동하는 링크 표시.
- `apps/admin`: 새 "계정" 탭(`app/accounts/`) — 이메일 입력 → 링크 발급 → 화면에 표시 + 복사 버튼. `AdminNav`에 세 번째 탭 추가(이 앱의 컨벤션대로 실제 세 번째 섹션이 생겼을 때만 추가).

## 검증

- `apps/api-server`: lint/typecheck/test(57/57)/build 통과. 실제 마이그레이션 적용.
- curl로 전체 플로우 실사용 검증 (임시 테스트 계정을 만들어 `ADMIN_USER_IDS`에 잠깐 추가한 뒤 원복): 링크 발급 → 토큰으로 비밀번호 재설정 → 기존 비밀번호 로그인 실패(401) → 새 비밀번호 로그인 성공(200) → 같은 토큰 재사용 시 실패(400, 이미 사용됨) 전부 확인. 관리자 아닌 세션으로 발급 시도 시 401/403도 확인.
- `apps/web`/`apps/admin`: 양쪽 lint/typecheck/test/build 통과. `pnpm --filter web build`에서 `/reset-password`가 정적 페이지로 정상 생성됨을 확인(Suspense 경계가 제대로 동작).
- Chrome에서 실제 클릭스루 검증: `apps/admin`의 "계정" 탭에서 링크 발급 → 화면에 표시된 URL/복사 버튼 확인 → 그 링크로 `apps/web`의 `/reset-password` 이동 → 새 비밀번호 입력 후 제출 → "비밀번호를 설정했습니다." 성공 화면 확인.
- 이 과정에서 실제 버그 하나 발견 및 수정: admin 아닌 세션으로 발급을 시도하면 `AdminGuard`의 기본 `ForbiddenException` 메시지("Forbidden")가 그대로 노출되고 있었음 — 다른 admin 페이지들은 사전 조회(GET) 쿼리로 forbidden 상태를 미리 감지해 한글 안내 문구를 보여주지만, 이 페이지는 조회 쿼리가 없어 뮤테이션의 403을 그대로 노출하고 있었음. `useAccountsAdmin`에서 401/403을 특별 처리해 다른 admin 페이지와 동일한 "이 계정은 접근 권한이 없어요." 문구로 통일.

## 부작용 (알아두어야 할 것)

- 브라우저 클릭스루 검증 중 실제로 존재하던 `test@test.com` 테스트 계정의 비밀번호가 검증 과정에서 실제로 변경됨(`qaTestNewPassword123`) — 원래 비밀번호를 몰라 복구하지 못했다. 이 계정이 필요하면 사용자가 다시 비밀번호를 설정해야 한다.

## 남은 일

- 익명 프로필/닉네임, 이메일 인증, 회원 답글 상한 등은 이번 라운드 범위 밖으로 명시적으로 제외 — 별도 라운드에서 다룰 예정 (관련 논의는 이 문서가 아니라 대화 맥락에만 남아있음, 필요시 재정리).
