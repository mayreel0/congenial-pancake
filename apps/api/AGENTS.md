# apps/api — Nest.js backend

앱 특정 규칙만 적는다. 프로젝트 전체 규칙(브랜치 정책, 결정 확인 절차 등)은 루트 `AGENTS.md`를 따른다.

## 실행

- `pnpm --filter api start:dev` — 로컬 실행. `.env`가 필요하다(`.env.example` 참고, `DATABASE_URL`은 로컬 Postgres를 가리켜야 함).
- `pnpm --filter api lint` / `typecheck`(`tsc --noEmit`) / `test` / `build` — 이 넷은 PR 전에 항상 통과해야 한다.
- `pnpm --filter api db:generate` — 스키마(`src/database/schema/*.schema.ts`) 변경분으로 마이그레이션 SQL 생성.
- `pnpm --filter api db:migrate` — 생성된 마이그레이션을 `DATABASE_URL` 대상 DB에 적용.

## 아키텍처 경계

서비스는 리포지토리/프로바이더 인터페이스에만 의존하고 Drizzle 클라이언트(`DRIZZLE` 토큰)를 직접 주입받지 않는다 — Drizzle 클라이언트는 `*.repository.ts` 안에서만 참조한다. 예: `src/auth/sessions.repository.ts`가 `DRIZZLE`을 주입받고, `src/auth/session.service.ts`는 `SessionsRepository`에만 의존한다.

## 인증

DB 기반 세션(`src/auth/`) — JWT가 아니다. `SessionGuard`는 쿠키(`SESSION_COOKIE_NAME`, 기본 `session_token`)와 `Authorization: Bearer` 헤더 둘 다에서 토큰을 읽어 같은 `SessionService`로 검증한다(웹은 쿠키, 향후 모바일 앱은 헤더). 세션은 사용자 단위가 아니라 기기/로그인 단위로 발급되며, 기기별 로그아웃은 해당 세션 행 삭제로 끝난다.

## DB / 신고·관리자 규칙

스키마와 신고 임계치, 관리자 식별 방식은 `docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md`에 근거가 있다 — 특히 `reports` 테이블의 `(target_type, target_id, reporter_id)` 유니크 제약과 서로 다른 3명 신고 시 자동 숨김 규칙은 스키마 변경 시 반드시 유지해야 한다.

## 아직 비어있는 모듈

`users`, `requests`, `replies`, `reports`, `moderation`, `admin`은 폴더와 빈 `@Module({})`만 있고 실제 provider/controller가 없다 — 각자의 기능 PR에서 채운다. 빈 채로 남겨두는 것은 의도된 것이지 누락이 아니다.
