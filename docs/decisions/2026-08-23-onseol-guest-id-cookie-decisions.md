# 온설 guestId → httpOnly 쿠키 전환 결정 - 2026-08-23

`docs/decisions/2026-08-22-onseol-answer-queue-decisions.md`에서 확인된 백로그 항목 1("guestId should move to a server-issued httpOnly cookie")을 구현한 라운드의 기록.

## 배경: 왜 지금의 guestId가 문제인가

지금까지 guestId는 프론트엔드가 `crypto.randomUUID()`로 생성해 `localStorage`에 저장하고, 매 요청마다 `X-Guest-Id` 헤더로 보내는 값이었다(`apps/web/app/lib/guest/guestId.ts`, 이번에 삭제). 비회원 글쓰기 1회·답장 5회 제한이 전부 이 값에 의존하는데, `localStorage`는 브라우저 devtools에서 한 줄로 읽고 바꿀 수 있어 제한을 우회하기가 너무 쉬웠다.

## 결정: IP/기기 핑거프린팅이 아니라 서버 발급 httpOnly 쿠키

대안으로 IP 기반 식별이나 기기 핑거프린팅을 검토했지만 기각했다:

- **신뢰성 문제**: CGNAT나 공용 IP에서는 서로 다른 사람이 같은 IP로 잡혀 오탐(false positive)이 생기고, VPN이나 네트워크 전환으로 어차피 손쉽게 우회된다.
- **제품 톤 문제**: 온설은 힘든 이야기를 짧게 털어놓는 지원/위로 앱이다. 핑거프린팅은 "추적당하는" 느낌을 주기 때문에 이 제품의 톤과 맞지 않는다고 판단했다.

httpOnly 쿠키를 절충안으로 택했다: 기존 세션 쿠키(`src/auth/session-cookie.ts`)와 같은 패턴이고, "devtools 한 줄" 수준에서 "쿠키를 지워야 함" 수준으로 우회 난이도를 높인다. 완전히 익명성 남용을 막지는 못한다(정의상 그 무엇도 못 막는다) — 애초에 그게 목표가 아니다. 최악의 경우도 "비회원 글 몇 개 더 남는" 정도라 낮은 리스크로 판단했다(원래 논의는 `docs/decisions/2026-08-22-onseol-answer-queue-decisions.md` 참고).

## 구현

- `GuestIdMiddleware` (`apps/api/src/common/middleware/guest-id.middleware.ts`) — `main.ts`에 `cookieParser()` 바로 뒤, 라우팅보다 먼저 전역으로 등록. `guest_id` 쿠키가 없으면 `randomUUID()`로 새로 발급해 `Set-Cookie`로 내려주고, 같은 요청 안에서도 바로 쓸 수 있도록 `req.cookies`에 즉시 반영한다. 세션 쿠키와 옵션을 공유하기 위해 `cookieOptions()`를 `src/auth/session-cookie.ts`에서 `src/common/cookie-options.ts`로 빼서 재사용했다. 만료는 365일(세션과 달리 DB에 저장되는 토큰이 아니라 그냥 불투명한 랜덤 값이라 별도 테이블이 필요 없다).
- `GuestId()` 데코레이터(`src/common/decorators/guest-id.decorator.ts`)는 이제 헤더 대신 쿠키를 읽는다. 미들웨어가 모든 요청에 값을 보장하므로 반환 타입을 `string | undefined`에서 `string`으로 좁혔다.
- 이에 따라 `RequestsService`/`RepliesService`/`AnswerInteractionsService`에 있던 "guestId가 없으면 던진다"(`GuestIdRequiredException`) 분기들이 전부 도달 불가능한 코드가 되어 삭제했다 — 예외 클래스 자체도 제거. 실제로 일어날 수 없는 경우를 방어하는 코드는 남겨두지 않는다는 원칙에 따름.
- 프론트엔드: `apps/web/app/lib/guest/guestId.ts` 삭제, `X-Guest-Id` 헤더를 보내던 모든 호출(`lib/requests/api.ts`, `lib/replies/api.ts`)에서 제거 — `apiFetch`가 이미 항상 `credentials: "include"`를 쓰므로 브라우저가 httpOnly 쿠키를 자동으로 실어 보낸다.

## 이번 라운드에서 하지 않은 것

- 로그인 사용자가 게스트로 작성했던 과거 글/답장을 계정에 합치는 기능(guestId → authorId 마이그레이션) — 애초에 범위 밖, 아직 요구된 적 없음.
- `GUEST_ID_COOKIE_NAME`을 `SESSION_COOKIE_NAME`처럼 환경변수로 노출하는 것 — 실제로 값을 바꿔야 할 이유가 없어서 상수로 고정. `GuestId()` 데코레이터가 `createParamDecorator`라 DI로 `ConfigService`를 주입받을 수 없다는 제약도 있었다.

## 검증

- 단위 테스트(`pnpm --filter api test`): `guest-id.middleware.spec.ts` 신규(쿠키 없을 때 발급 후 `req.cookies`에 반영/이미 있으면 그대로 둠), `requests.service.spec.ts`/`replies.service.spec.ts`/`answer-interactions.service.spec.ts`에서 이제 불가능해진 "guestId 없음" 케이스 제거.
- 로컬 Postgres + 실제 서버에 `curl --cookie-jar`로 직접 검증: 쿠키 없이 첫 요청 시 `Set-Cookie: guest_id=...`가 내려오는지, 그 쿠키로 두 번째 요청을 보내면 같은 guestId로 식별되는지(비회원 1회 글쓰기 제한이 정상 작동하는지), 쿠키가 `HttpOnly`로 표시되는지.
