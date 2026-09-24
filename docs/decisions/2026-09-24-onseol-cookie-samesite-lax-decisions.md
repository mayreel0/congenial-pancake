# 온설 운영 쿠키 SameSite=None → Lax 전환 결정 기록

Linear: DEV-50

## 배경

2026-09-24 지식 baseline 조사에서, 운영 환경의 세션 쿠키와 `guest_id` 쿠키가 `SameSite=None`인 근거가 이미 사라진 전제에 기대고 있다는 걸 확인했다.

- `None`은 2026-08-21 `78dbc14`(세션)와 2026-08-23 `a824373`(`guest_id`)에서 들어왔다. 근거는 "프론트엔드(Vercel)와 백엔드(개인 서버)가 서로 다른 사이트"였다(`2026-08-21-onseol-auth-api-decisions.md` 결정 4, `common/cookie-options.ts` 주석).
- 백엔드가 `api.onseol.com`(AWS)으로 옮겨간 뒤(`2026-09-01-onseol-aws-deployment-phase1-decisions.md`) 이 값을 다시 검토한 기록이 없었다.
- 현재 운영은 web `onseol.com`, admin `*.onseol.com` 서브도메인, API `api.onseol.com`이다(`infra/terraform/locals.tf`의 `cors_origin`). 셋 다 등록 도메인(eTLD+1)이 같아 브라우저 입장에서 같은 사이트다. 같은 원리는 이미 `2026-08-25-onseol-admin-app-split-decisions.md`에서 web↔admin 세션 공유 근거로 쓰였다.

## 결정: 운영에서도 Lax, CSRF 방어는 그대로 유지

사용자 결정: 앞으로도 같은 도메인 구조로 가고, `None`을 유지할 필요가 없다면 위험을 없애는 방향으로 간다.

근거:
- 같은 사이트 요청이라 `Lax`로도 web·admin의 fetch와 SSE(`EventSource` + `withCredentials`)에 쿠키가 실린다.
- OAuth 콜백은 provider에서 돌아오는 최상위 GET 이동이라 `Lax` 쿠키가 실린다. 실제로 OAuth state/연동 의도 쿠키는 처음부터 운영에서도 `lax`로 동작해 왔다(`auth.controller.ts`의 `OAUTH_STATE_COOKIE`, `OAUTH_LINK_INTENT_COOKIE`).
- `None`이면 무관한 사이트에서 시작된 요청에도 쿠키가 실린다. 지금까지는 CSRF Origin 검사(`csrf-origin.middleware.ts`)와 JSON 전용 body parser(`main.ts`)가 이를 막고 있었다. `Lax`로 바꾸면 브라우저 단계에서 먼저 막힌다.

두 방어 장치는 지우지 않는다. `SameSite`는 "같은 사이트"만 보므로 형제 서브도메인에서 온 요청은 막지 못하지만, Origin 허용 목록은 정확한 origin 단위라 그 경우도 막는다. 두 곳의 주석은 "쿠키가 None이라서"라는 옛 근거 대신 현재 역할(이중 방어)로 고쳤다.

## 구현

- `apps/api-server/src/common/cookie-options.ts`: 운영에서도 `sameSite: 'lax'`. `secure`는 운영에서 그대로 `true`.
- `apps/api-server/src/common/cookie-options.spec.ts`: 운영/비운영 옵션을 고정하는 테스트 추가.
- `main.ts`, `csrf-origin.middleware.ts`, `apps/web/app/lib/notifications/useNotificationStream.ts`: `SameSite=None` 전제의 주석 갱신.

이미 발급된 `None` 쿠키는 브라우저가 이름·도메인·경로로 구분하므로, 다음 로그인이나 `guest_id` 재발급 때 `Lax`로 덮어써진다. 로그아웃(`clearSessionCookie`)도 그대로 지워진다.

## 검증

- `pnpm --filter api-server lint`/`typecheck`/`test`/`build`, `pnpm --filter web lint`/`typecheck`/`test`.
- 배포 후 운영에서 확인할 항목(DEV-50): web 이메일 로그인/로그아웃, admin 로그인과 web↔admin 세션 공유, Google OAuth 왕복, SSE 알림 수신, 비회원 글쓰기(`guest_id` 발급·유지).

## 남은 일

- 배포 후 위 운영 검증.
- admin 서브도메인의 실제 값은 공개 저장소에 적지 않는다(`infra/terraform/variables.tf`의 `admin_subdomain` 설명).
