# 온설 API rate limiting 결정 기록

## 배경

[[answer-queue-backlog]] item 4로 기록돼 있던 두 가지 과제 중 하나. "DB 기반 설정 테이블로 하드코딩 값을 옮겨 `/admin`에서 조정 가능하게 하기"는 `/admin` 모듈이 아직 없어(빈 `@Module({})`) 이번 라운드에서 제외하고, `/admin`과 무관하게 지금 바로 구현 가능한 rate limiting만 이번 라운드에서 처리했다. 사용자가 세 가지 범위(rate limiting만 / `/admin` 먼저 구축 / DB 테이블만 먼저) 중 rate limiting만 진행하는 쪽을 선택함(2026-08-25).

## 결정 1: 전역 기본값 + 라우트별 오버라이드

`@nestjs/throttler`를 `APP_GUARD`로 앱 전체에 적용하고, 기본값은 **IP당 60초에 100회**로 뒀다. `POST /auth/signup`, `POST /auth/login`은 `@Throttle` 데코레이터로 **IP당 60초에 5회**로 더 엄격하게 오버라이드했다.

### 근거

이 서비스 규모에서 일반 GET/큐 폴링 트래픽을 막을 이유가 없어 기본값은 넉넉하게 뒀다. 반면 로그인/가입은 고전적인 무차별 대입·스팸 가입 표적이라 훨씬 낮은 한도가 필요하다고 판단했다. 게스트 글/답변 개수 캡(1회/전체 5회, `RequestsService`/`RepliesService`)은 이미 별도로 존재하는 스팸 방지 장치라 이번 rate limiting과는 목적이 다르며(개수 제한 vs 요청 빈도 제한) 손대지 않았다.

## 결정 2: 프로덕션에서만 `trust proxy` 활성화

`main.ts`에서 `NODE_ENV === 'production'`일 때만 `app.set('trust proxy', 1)`을 호출한다.

### 근거

리버스 프록시 뒤에서는 `req.ip`가 프록시 자신의 주소가 되어, 이 설정 없이는 모든 사용자가 같은 IP로 잡혀 앱 전체가 하나의 쓰로틀 버킷을 공유하게 된다(사실상 전체 서비스가 100req/60s를 나눠 씀). 로컬 개발은 프록시 없이 직접 연결되므로 이 설정이 불필요하고, 실제로 존재하지 않는 프록시를 무조건 신뢰하는 것도 바람직하지 않아 프로덕션에서만 켰다.

## 산출물

- `apps/api/src/app.module.ts`: `ThrottlerModule.forRoot()` + `APP_GUARD`로 `ThrottlerGuard` 전역 등록.
- `apps/api/src/auth/auth.controller.ts`: `signup`/`login`에 `@Throttle({ default: { ttl: 60_000, limit: 5 } })`.
- `apps/api/src/main.ts`: `NestFactory.create<NestExpressApplication>` + 프로덕션 전용 `trust proxy` 설정.
- `apps/api/AGENTS.md`에 "Rate limiting" 섹션 추가.

## 검증

- `pnpm --filter api lint` / `typecheck` / `test`(52) / `build` 모두 통과.
- 로컬 서버에 실제 curl로 확인: `/auth/login`에 존재하지 않는 계정으로 6회 연속 요청 → 1~5회는 401(정상 인증 실패), 6회째는 429(`ThrottlerException`)로 차단. `/health`에 10회 연속 요청은 전부 200(기본 한도 100/60s 안에서는 영향 없음).

## 남은 과제

item 4의 나머지 절반(하드코딩된 한도를 DB 기반 설정 테이블로 옮겨 `/admin`에서 조정 가능하게 하기)은 여전히 `/admin` 모듈(whitelist guard + 신고 검토 UI, `docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md` 기준)이 먼저 있어야 의미가 있어 보류. `QUEUE_FRESHNESS_HOURS`, `QUEUE_REPLY_CAP`, `GUEST_REPLY_LIMIT`(전역 개수 캡, rate limiting과는 별개) 등은 이미 이름 붙여진 상수로 중앙화돼 있어 나중에 DB 설정으로 옮기는 비용은 낮게 유지된다.
