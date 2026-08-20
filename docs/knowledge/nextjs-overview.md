---
title: Next.js 개요와 이 프로젝트에서의 역할
date: 2026-08-21
status: reference
scope: apps/web이 쓰는 Next.js의 범위, Drizzle/apps/api와의 경계
---

# Next.js 개요

## Next.js가 하는 일

Next.js는 React 기반 **프론트엔드 프레임워크**다. 이 프로젝트(`apps/web`)에서 실제로 쓰는 부분:

- **App Router** (`app/` 디렉터리): 폴더 구조 자체가 라우팅이 된다. `app/today/page.tsx`가 `/today` 경로가 되는 식. `layout.tsx`는 하위 페이지를 감싸는 공통 레이아웃.
- **렌더링 전략**: 이 프로젝트는 `pnpm build`(`next build --webpack`)로 정적 생성(Static Generation)만 쓴다 — `/today`, `/answer`, `/read`, `/login`, `/me` 전부 빌드 시점에 정적 HTML로 미리 만들어진다(`○ (Static) prerendered as static content`). 서버 컴포넌트/서버 액션, ISR(증분 정적 재생성), SSR(요청마다 서버 렌더링) 같은 Next.js의 다른 기능은 지금 안 쓴다 — 지금은 로그인/데이터가 전부 localStorage 프로토타입이라 서버가 필요 없기 때문이다. 실제 백엔드(`apps/api`) 붙이는 로그인/내 기록 기능부터는 이 부분을 다시 검토해야 한다(클라이언트에서 fetch할지, 서버 컴포넌트에서 할지).
- **번들링/최적화**: 이미지 최적화, 코드 스플리팅, `next.config.ts` 설정 등은 Next.js가 알아서 한다.

## Next.js가 하지 않는 일 (이 프로젝트 기준)

- **DB/ORM과 무관하다.** Drizzle, Postgres, `apps/api`의 어떤 것도 Next.js는 모른다. `apps/web`은 오직 HTTP(`fetch`)로 `apps/api`와 통신한다 — 지금은 그 통신 자체가 아직 없다(전부 localStorage 프로토타입).
- Next.js에도 "API Routes"(`app/api/*/route.ts`)라는, Next.js 안에 작은 백엔드를 넣는 기능이 있다. 이 프로젝트는 그 기능을 안 쓴다 — 백엔드는 별도 Nest.js 앱(`apps/api`)으로 분리하기로 이미 결정했기 때문이다(`docs/decisions/2026-08-14-onseol-product-decisions.md`).

## 이 버전 Next.js 관련 참고

`apps/web/AGENTS.md`는 `next dev`가 자동으로 써넣는 파일로, "이 버전은 학습 데이터와 다를 수 있다"는 경고와 함께 `node_modules/next/dist/docs/`를 실제 문서로 가리킨다 — 버전 특정 API는 그 경로를 최신 소스로 삼는다.

## 관련 문서

- 아키텍처 경계: `docs/decisions/2026-08-14-onseol-product-decisions.md`
- 저장소 구조(`apps/web`/`apps/api` 분리 경위): `docs/decisions/2026-08-21-onseol-backend-structure-decisions.md`
- Drizzle과의 역할 비교: `docs/knowledge/drizzle-overview.md`
