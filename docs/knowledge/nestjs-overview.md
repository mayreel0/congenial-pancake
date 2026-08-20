---
title: Nest.js 개요와 Drizzle과의 역할 구분
date: 2026-08-21
status: reference
scope: apps/api의 애플리케이션 레이어(Nest.js)와 DB 레이어(Drizzle)가 어디서 나뉘는지
---

# Nest.js 개요

## Nest.js가 하는 일

Nest.js는 **Node.js 백엔드 애플리케이션 프레임워크**다(`apps/api`). Angular에서 가져온 데코레이터 + 의존성 주입(DI) 패턴이 특징이고, 기본적으로 Express 위에서 돌아간다(`@nestjs/platform-express` — 이 프로젝트가 씀). Nest.js가 실제로 담당하는 것:

- **모듈 시스템** (`@Module`): 기능 단위로 코드를 묶는다. `apps/api/src/app.module.ts`가 `AuthModule`, `DatabaseModule`, `HealthModule` 등을 조립하는 최상위 모듈.
- **의존성 주입(DI)**: 클래스에 `@Injectable()`을 붙이면 Nest가 생성자 인자를 보고 필요한 인스턴스를 자동으로 만들어 넣어준다. 예: `SessionService`의 생성자가 `SessionsRepository`를 받으면, Nest가 알아서 `SessionsRepository` 인스턴스를 만들어 주입한다 — 직접 `new`할 필요가 없다.
- **컨트롤러** (`@Controller`, `@Get`/`@Post` 등): HTTP 라우트를 클래스 메서드에 매핑한다. 예: `src/health/health.controller.ts`의 `@Get() check()`가 `GET /health`가 된다.
- **가드/파이프/인터셉터**: 요청이 컨트롤러에 도달하기 전/후에 끼어드는 계층. 이 프로젝트에선 `SessionGuard`(인증 검증)와 전역 `ValidationPipe`(요청 body를 DTO로 검증)를 쓴다.
- **환경변수/설정**: `@nestjs/config`로 감싸서 DI 컨테이너 안에서 `ConfigService`로 주입받아 쓴다(`src/config/`).

## Drizzle과의 경계 — 이게 원래 질문의 핵심

Nest.js는 **HTTP 요청/응답, DI, 라우팅, 검증**을 담당하고, DB 자체는 전혀 모른다. Drizzle은 **SQL/DB 접근**만 담당하고, HTTP나 DI 개념을 전혀 모른다. 이 프로젝트에서 둘을 잇는 지점은 딱 한 곳이다:

- `src/database/database.module.ts` — Drizzle 클라이언트를 만들어서 `DRIZZLE`이라는 이름의 Nest provider로 등록한다. 이 순간부터 Drizzle 클라이언트는 "Nest가 관리하는 주입 가능한 객체" 하나가 된다.
- 그 이후로는 **오직 `*.repository.ts` 파일만** `DRIZZLE`을 주입받아 Drizzle 쿼리를 쓴다(예: `src/auth/sessions.repository.ts`).
- `*.service.ts`(비즈니스 로직)는 리포지토리에만 의존하고, `*.controller.ts`(HTTP 계층)는 서비스에만 의존한다. 즉 **컨트롤러 → 서비스 → 리포지토리 → Drizzle** 순으로만 흐르고, 역방향이나 계층을 건너뛰는 의존은 없다.

비유하면: Nest.js는 "요청이 어떤 함수를 호출하게 할지, 그 함수가 뭘 필요로 하는지"를 관리하는 배관공이고, Drizzle은 그 배관 끝에 달린 "DB에 말 거는 도구" 하나일 뿐이다. Drizzle을 다른 DB 라이브러리로 바꿔도 Nest.js의 모듈/컨트롤러/DI 구조는 그대로다 — `database.module.ts`와 각 `*.repository.ts`만 바뀐다.

## 관련 문서

- Drizzle 자체에 대한 지식: `docs/knowledge/drizzle-overview.md`
- 이 프로젝트의 실제 계층 규칙: `apps/api/AGENTS.md`("Architecture boundary", "DTOs vs domain models" 절)
