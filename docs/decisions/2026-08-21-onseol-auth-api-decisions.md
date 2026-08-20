# 온설 인증 API 결정 - 2026-08-21

`apps/api`에 첫 실제 라우트(`/auth/*`)를 추가하면서 정한 결정을 기록한다. 세션 방식(DB 기반) 자체는 이미 `docs/decisions/2026-08-21-onseol-backend-structure-decisions.md`에서 정했고, 이 문서는 그 위에 실제 로그인 API를 구현하면서 나온 결정들을 다룬다.

## 결정 1: 이번 PR 범위 — 백엔드 API만, 프론트엔드 연동은 별도 PR

`apps/web`은 `/login`, `/me`, `ServiceNav`를 포함해 API 호출이 하나도 없는 100% localStorage 프로토타입이다. 이번 PR은 `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/google`, `/auth/google/callback` 라우트를 구현하고 단위 테스트 + 로컬 Postgres에 대한 `curl` 검증까지만 다룬다. 실제 `/login` 폼을 이 API에 연결하는 건 다음 PR이다.

### 근거

사용자가 명시적으로 분리를 요청했다 — 하나의 PR로 묶으면 리뷰가 커지고, 프론트 연동은 그 자체로 별도 판단(에러 메시지 UX, 로딩 상태, 리다이렉트 흐름)이 필요해서 나눠 가는 게 맞다고 판단했다.

## 결정 2: OAuth는 Passport 없이 직접 구현

`passport-kakao`(1.0.1, 2022-06 마지막 배포), `passport-naver`/`passport-naver-v2`(둘 다 2022년 마지막 배포)는 사실상 방치된 패키지다. `@nestjs/passport` 자체는 유지보수되고 있지만, 조합하면 방치된 전략 패키지에 의존하게 된다.

### 근거

각 OAuth 제공자의 실제 작업은 authorize URL로 리다이렉트 → code를 token으로 교환(`fetch` POST) → profile 조회(`fetch` GET) 세 단계뿐이라, Passport의 추상화 없이도 코드량이 크게 늘지 않는다. Drizzle을 Prisma 대신 고른 것과 같은 이유("명시적, 마법 없음", 방치된 의존성 회피)로 `src/auth/oauth/oauth-provider.interface.ts` + 제공자별 클래스(`google-oauth.provider.ts`)로 직접 구현했다. Kakao/Naver도 같은 인터페이스로 추가할 예정이다.

## 결정 3: Google부터, Kakao/Naver는 후속 PR

세 제공자 모두 사용자가 각자의 외부 콘솔(Google Cloud Console, Kakao Developers, Naver Developers)에서 앱을 등록하고 client id/secret을 발급받아야 실제 동작 확인이 가능하다. 한 번에 셋을 구현하면 패턴이 틀렸을 때 세 곳 모두 다시 손봐야 한다.

### 근거

Google부터 구현해서 `OAuthProvider` 인터페이스 패턴을 검증한 뒤, 같은 패턴을 Kakao/Naver에 반복 적용하는 편이 리스크가 낮다. 사용자는 지금 Google Cloud Console에만 앱을 등록하면 된다.

## 결정 4: 쿠키 SameSite/Secure

세션 쿠키는 프로덕션에서 `sameSite: "none"`, `secure: true`, 로컬 개발에서는 `sameSite: "lax"`, `secure: false`로 설정한다(`src/auth/session-cookie.ts`).

### 근거

프론트엔드(Vercel)와 백엔드(개인 서버)가 서로 다른 origin이라, 실제 배포 환경에서는 크로스사이트 쿠키 전송이 필요하다 — `SameSite=None`은 `Secure`(HTTPS)를 강제하므로 프로덕션에서만 켠다. 로컬 개발은 `http://localhost:3000`/`http://localhost:3001`처럼 서로 다른 포트지만 같은 사이트로 취급되어 `Lax`로도 동작한다.

## 결정 5: DB 스키마 — `oauth_identities` 별도 테이블, `password_hash` nullable

`users.password_hash`를 nullable로 바꾸고(OAuth 전용 계정은 비밀번호가 없음), `oauth_identities`(`user_id`, `provider`, `provider_account_id`, `(provider, provider_account_id)` 유니크)를 추가했다. 같은 이메일로 이미 비밀번호 계정이 있는 사용자가 Google로 로그인하면, 새 계정을 만들지 않고 기존 계정에 연결한다.

## 결정 6: 에러 코드 표준화

모든 에러 응답은 `{ statusCode, code, message }` 형태로 통일한다(`src/common/filters/app-exception.filter.ts`). 도메인 에러(`AUTH_EMAIL_TAKEN`, `AUTH_INVALID_CREDENTIALS`, `AUTH_OAUTH_EXCHANGE_FAILED`)는 `AppException`을 상속해 `code`를 직접 지정하고, `ValidationPipe`가 던지는 것 같은 일반 `HttpException`은 상태 코드 기반으로 일반 코드(`VALIDATION_ERROR` 등)에 매핑한다. 프론트엔드가 `message`(사람이 읽는 문자열, 나중에 바뀔 수 있음) 대신 `code`(안정적인 값)로 분기할 수 있게 하는 게 목적이다.

## 산출물

- `apps/api/src/auth/`: `auth.controller.ts`, `auth.service.ts`, `oauth-identities.repository.ts`, `oauth/`(인터페이스 + Google 구현), `session-cookie.ts`.
- `apps/api/src/users/`: `users.repository.ts`, `users.service.ts` — 처음으로 채워진 빈 모듈.
- `apps/api/src/common/`: `exceptions/app.exception.ts`, `filters/app-exception.filter.ts` — 신규 최상위 폴더.
- 스키마: `users.password_hash` nullable, `oauth_identities` 테이블 신규.
- `apps/api/AGENTS.md` 갱신 — DTO/에러 코드/OAuth 절이 "예정"에서 실제 구현 반영으로 바뀜.

## 검증

- 단위 테스트(`pnpm --filter api test`, 19개): `auth.service.spec.ts`(signup/login/Google 계정 연결 로직), `google-oauth.provider.spec.ts`(`fetch` 모킹), `app-exception.filter.spec.ts`.
- 자동 e2e에는 포함하지 않음 — 이 저장소에 아직 CI/DB-in-CI가 없어서, 실제 라우트는 임시 Postgres 컨테이너 + `curl`로 직접 검증했다: signup → `/auth/me` → 중복 이메일 409 → login 성공/실패(401) → 유효성 검증 실패(400, 필드별 메시지) → logout(204, 그 세션만 무효화되고 다른 세션은 유지됨을 확인) → `/auth/google` 리다이렉트 URL 구성 → 잘못된 state의 콜백이 502로 거부됨.
- Google 자격증명이 없어 실제 동의 화면까지 가는 end-to-end는 못 했다 — `exchangeCode`의 fetch 로직은 단위 테스트로만 검증됨. 사용자가 Google Cloud Console에서 client id/secret을 발급하면 실제 확인 가능.
