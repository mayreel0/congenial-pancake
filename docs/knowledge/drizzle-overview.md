---
title: Drizzle 개요와 이 프로젝트에서의 역할
date: 2026-08-21
status: reference
scope: apps/api가 쓰는 Drizzle의 범위, Prisma와의 비교, Next.js/apps/web과의 경계
---

# Drizzle 개요

## Drizzle이 하는 일

Drizzle(`drizzle-orm`)은 **ORM/쿼리 빌더**다. `apps/api`(Nest.js 백엔드)에서만 쓰이고, PostgreSQL과 대화하는 유일한 통로다.

- **스키마 정의** (`apps/api/src/database/schema/*.schema.ts`): 테이블을 그냥 TypeScript 값으로 선언한다. 예: `pgTable("users", { id: uuid("id").primaryKey()... })`. 이게 코드 전체다 — Prisma처럼 별도 DSL 파일이나 `generate` 단계가 없다.
- **쿼리**: `db.insert(users).values(...)`, `db.query.sessions.findFirst({ where: ... })`처럼 SQL과 거의 1:1 대응되는 타입 안전 쿼리 빌더. `db.query.*` 형태(관계형 API)와 `db.select()/insert()/update()/delete()` 형태(SQL형 API) 둘 다 지원한다.
- **마이그레이션** (`drizzle-kit`, `apps/api/drizzle.config.ts`): 스키마 파일을 실제 DB 스키마와 비교해서 SQL 마이그레이션 파일을 생성(`db:generate`)하고 적용(`db:migrate`)한다. 생성된 SQL은 `apps/api/drizzle/*.sql`에 그대로 커밋된다 — 사람이 읽고 리뷰할 수 있는 평문 SQL이라는 게 장점.

## Drizzle이 하지 않는 일

- **DB 자체를 만들지 않는다.** `CREATE DATABASE onseol;`은 Drizzle/마이그레이션 이전에 사람이(또는 인프라 스크립트가) 직접 해야 한다. Drizzle은 이미 존재하는 DB 안에 테이블만 만든다.
- **Next.js/`apps/web`과 무관하다.** 프론트엔드는 Drizzle을 import하지 않는다. DB 데이터가 필요하면 `apps/api`가 HTTP API로 내려준다.

## Prisma와 비교했던 이유 (요약)

Drizzle을 선택하면서 Prisma의 장단점을 검토한 전체 근거는 `docs/decisions/2026-08-21-onseol-backend-structure-decisions.md`에 있다. 핵심만 요약하면:

- Prisma는 `schema.prisma`(별도 DSL) → `prisma generate`(codegen)를 거쳐야 타입이 포함된 클라이언트가 생긴다. Drizzle은 스키마 파일 자체가 이미 최종 TypeScript라 이 단계가 없다.
- Prisma의 쿼리 엔진은 Rust 네이티브 바이너리라 배포 OS에 맞는 `binaryTargets` 설정이 필요하고, 서버리스 환경에선 콜드 스타트 이슈가 있었다(최근 개선 중). 이 프로젝트는 상시 구동 서버 배포라 이 문제 자체가 없지만, Drizzle의 코드젠 없는 구조가 더 이 프로젝트의 스타일("명시적, 마법 없음")과 맞아서 최종 선택했다.

## 아키텍처 경계

서비스(`*.service.ts`)는 Drizzle 클라이언트를 직접 주입받지 않고, 리포지토리(`*.repository.ts`)에만 의존한다 — Drizzle은 리포지토리 안에서만 등장한다. 자세한 건 `apps/api/AGENTS.md` 참고.

## 관련 문서

- ORM 선택 근거 전문: `docs/decisions/2026-08-21-onseol-backend-structure-decisions.md`
- 스키마/신고 임계치 근거: `docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md`
- Next.js와의 역할 비교: `docs/knowledge/nextjs-overview.md`
