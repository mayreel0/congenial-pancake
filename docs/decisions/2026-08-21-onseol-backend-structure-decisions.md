# 온설 백엔드 구조 · 인증 · ORM 결정 - 2026-08-21

이 문서는 `docs/decisions/2026-08-14-onseol-product-decisions.md`가 "확정 전에 물어볼 결정"으로 남겨둔 인증 방식(cookie session vs JWT)을 확정하고, Nest.js 백엔드를 실제로 시작하면서 함께 정한 저장소 구조와 ORM 선택을 기록한다.

## 결정 1: 저장소 구조 — `apps/web` + `apps/api` 대칭 모노레포

기존 Next.js 앱 전체를 `apps/web/`으로 옮기고 `apps/api/`(Nest.js)를 새로 추가하는 구조로 갔다(PR #58, `feat/nestjs-api-scaffold`로 이어짐).

```text
congenial-pancake/
├─ apps/
│   ├─ web/   Next.js 프론트엔드
│   └─ api/   Nest.js 백엔드
├─ docs/
├─ AGENTS.md / CLAUDE.md / README.md   (프로젝트 전체 규칙만)
└─ pnpm-workspace.yaml   (packages: apps/*)
```

### 근거

설계 단계에서는 "루트를 그대로 두고 `apps/api`만 추가"하는 낮은 diff의 대안을 추천했다. 하지만 사용자가 두 옵션의 트리 구조를 직접 비교한 뒤 대칭적인 이동을 명시적으로 선택했다 — 프론트/백엔드가 나중에도 구조적으로 동등하게 취급되길 원했기 때문이다. 리스크가 더 큰 선택이라 별도 PR(#58)로 분리해서 처리했고, 각 앱은 자기 `AGENTS.md`를 갖는 컨벤션(`apps/web/AGENTS.md`, `apps/api/AGENTS.md`)으로 정리했다 — 루트 `AGENTS.md`는 프로젝트 전체 규칙만 남긴다.

## 결정 2: 인증 — DB 기반 세션

**Nest.js 자체 인증은 DB 기반 세션으로 구현한다. JWT는 쓰지 않는다.**

- 세션은 **기기/로그인 단위**로 발급한다(사용자 단위 아님) — 로그인할 때마다 새 세션 행이 생긴다.
- 웹은 httpOnly 쿠키(`SESSION_COOKIE_NAME`, 기본값 `session_token`)로, 향후 모바일 앱은 `Authorization: Bearer <token>` 헤더로 토큰을 전송한다. 두 트랜스포트 모두 같은 서버 측 세션 저장소(`sessions` 테이블)를 조회해 검증한다.
- 기기별 로그아웃이 필요할 때 해당 세션 행 하나만 지우면 끝난다. JWT였다면 로그아웃/폐기를 위해 별도 revocation 메커니즘(블랙리스트, 짧은 만료 + refresh token 등)이 필요했을 것이다 — DB 세션은 애초에 서버가 상태를 갖고 있어서 이 문제가 생기지 않는다.
- 배포가 프론트(Vercel)/백엔드(개인 서버)로 분리되므로 CORS(`credentials: true`, 명시적 origin, 쿠키 `SameSite`)를 처음부터 설정했다(`apps/api/src/main.ts`).

### 근거

모바일 앱까지 고려했을 때도 DB 세션이 JWT보다 단순하다고 판단했다. JWT의 장점(서버 조회 없이 검증 가능, 수평 확장 용이)은 지금 규모(개인 서버 단일 인스턴스)에서 크게 필요하지 않은 반면, 로그아웃/세션 폐기를 단순하게 처리할 수 있다는 DB 세션의 장점이 더 크다고 봤다.

## 결정 3: ORM — Drizzle

**Drizzle을 쓴다.** 테이블 정의 자체가 평범한 TypeScript이고 별도 codegen 단계가 없다. `drizzle-kit`은 스키마 변경분으로부터 마이그레이션 SQL을 생성하는 데만 쓰인다(쿼리 클라이언트 생성이 아님).

### Prisma를 검토했지만 채택하지 않은 이유

Prisma의 추상화 수준과 서버리스 콜드 스타트 개선 상황에 대한 질문이 있어 근거를 남긴다.

- **추상화 수준**: Prisma의 관계/nested write/트랜잭션 타입 안전성은 실제로 잘 되어 있다. 다만 Prisma 자체 DSL(`schema.prisma`)로 스키마를 작성해야 하고, 복잡한 쿼리(윈도우 함수, 부분 유니크 upsert 등)는 `$queryRaw`로 벗어나야 하며 그 순간 타입 안전성을 잃는다.
- **codegen 단계**: `schema.prisma` 작성 → `prisma generate` 실행 → 그 결과로 타입이 포함된 `PrismaClient`가 `node_modules`에 생성된다. 이 생성된 클라이언트가 실제로 `import`해서 쓰는 코드이며, 스키마를 바꿀 때마다 그리고 CI/새 클론 환경마다 이 단계를 거쳐야 TypeScript가 컴파일된다. Drizzle은 이 단계 자체가 없다 — 스키마 파일을 저장하는 순간 바로 타입이 반영된다.
- **플랫폼별 바이너리**: Prisma의 쿼리 엔진은 Rust 네이티브 바이너리라 `binaryTargets` 설정이 dev/배포 OS와 맞아야 한다(예: macOS 개발 → Linux 개인 서버 배포 시 잘못 설정하면 런타임에서 깨진다).
- **서버리스 콜드 스타트**: Prisma는 별도 프로세스로 뜨는 쿼리 엔진 때문에 서버리스 환경(Vercel Functions, Lambda)에서 콜드 스타트가 느리다는 지적을 오래 받아왔다. 최근 WASM 기반 엔진과 Prisma Accelerate로 개선 중이다. **다만 이 프로젝트엔 현재 무관하다** — 백엔드는 개인 서버에서 상시 구동되는 Nest.js 프로세스로 배포하므로 콜드 스타트가 애초에 발생하지 않는다. 나중에 서버리스 배포로 옮기게 되면 이 지점을 다시 검토할 가치가 있다.

Drizzle은 기존 프론트엔드 프로토타입이 이미 가진 "명시적, 마법 없음" 코드 스타일과도 맞아서 선택했다.

## 산출물

- `apps/api` Nest.js 스캐폴딩(`feat/nestjs-api-scaffold`): `config`(zod 환경변수 검증), `database`(Drizzle client + `users`/`sessions`/`requests`/`replies`/`reports` 스키마 + 첫 마이그레이션), `auth`(세션 리포지토리/서비스/가드/데코레이터, bcrypt 비밀번호 해셔), `health`(`GET /health`). `users`/`requests`/`replies`/`reports`/`moderation`/`admin`은 폴더와 빈 모듈만 두고 각자의 기능 PR에서 채운다.
- `docs/decisions/2026-08-14-onseol-product-decisions.md`의 "cookie session vs JWT" 항목을 이 문서로 resolved 처리.

## 추가 결정 (2026-08-21, 스캐폴딩 PR 리뷰 중)

같은 스캐폴딩 PR을 리뷰하던 중 나온 질문에서 세 가지를 추가로 확정했다. 실제 구현은 아직 안 했다 — 실제 라우트가 생기는 로그인 기능 PR에서 함께 처리하기로 했다(자세한 이유는 `apps/api/AGENTS.md`의 "OAuth"/"Error codes" 절 참고).

- **OAuth**: 이메일/비밀번호 외에 Google, Naver, Kakao를 지원한다. 기존 DB 세션 설계와 그대로 호환된다 — OAuth 콜백에서 `users` 행을 찾거나 만든 뒤 동일한 `SessionService`로 세션을 발급하면 된다. `users` 스키마는 로그인 PR에서 조정 필요(`password_hash`를 nullable로, OAuth 계정 연결을 위한 테이블 추가 검토).
- **에러 코드**: 공통 에러 응답 형태(HTTP status + 프론트가 분기할 수 있는 안정적인 도메인 에러 코드) + 전역 exception filter를 로그인 PR에서 함께 설계한다. 지금은 표준화할 실제 라우트가 없어서 먼저 만들지 않는다.
- **DTO/도메인 모델 분리**: 컨트롤러는 Drizzle 스키마 타입을 절대 직접 주고받지 않는다 — 요청은 `class-validator` DTO, 응답은 DTO/매퍼로 변환해서 내려준다. 이번 PR에서 `class-validator`/`class-transformer`를 설치하고 전역 `ValidationPipe`(`whitelist: true, forbidNonWhitelisted: true`)를 `main.ts`에 미리 켜뒀다 — 아직 DTO가 하나도 없어서 지금은 동작에 영향이 없지만, 로그인 PR부터 이 컨벤션을 따른다.
