# 온설 /admin 앱 분리 결정 기록

## 배경

PR #76(`docs/decisions/2026-08-25-onseol-admin-moderation-decisions.md`)에서 `/admin`을 `apps/web` 안의 라우트로 구현·병합했다. 병합 직후 사용자가 "누군가 admin으로 접근을 시도할 수 있는게 별로 좋아보이진 않는다"는 우려를 제기했다.

## 결정 1: URL을 숨기지 않고, 완전히 별도의 앱으로 분리한다

세 가지 안(경로만 추측 어렵게 변경 / 현상 유지 / 완전 별도 배포)을 제시했고, 사용자가 완전 별도 배포를 선택했다. 근거로 "추측 어려운 경로도 실질적 방어력은 비슷하다고 보고, 지금 분리해두면 이후에 크게 복잡해지지 않을 것"이라고 판단함.

### 근거

경로 난독화(예: `/ops-7f2k`)는 `AdminGuard`(화이트리스트 검증)가 이미 제공하는 것 이상의 실제 보안을 더해주지 않는다 — WordPress `/wp-admin`, Django `/admin`도 예측 가능한 경로에 인증만으로 방어한다. 다만 `apps/web`에 `/admin` 라우트가 존재하는 한, 비로그인 상태로 그 경로에 접근했을 때 "로그인이 필요한 페이지"라는 응답 자체가 "여기 관리자 화면이 있다"는 사실을 노출해 봇 스캐닝 대상이 되기 쉬웠다. 완전히 별도 앱으로 분리하면 공개 사이트(`apps/web`) 번들에는 관리자 코드/문자열/라우트가 아예 존재하지 않는다 — 찾을 대상 자체가 없다.

이 시점에 실제 배포 인프라(vercel.json, Dockerfile, CI/CD)는 전혀 없는 상태였다(로컬 개발만 존재). 그래서 이번 라운드는 **코드 레벨 분리**만 하고, 실제 서브도메인/별도 프로젝트 배포는 실제 배포 시점으로 미룬다 — `docs/decisions/2026-08-14-...-decisions.md`가 이미 "개인 PC/서버 단계의 reverse proxy, TLS, backup, monitoring, deploy 방식"을 "Deferred to Planning"으로 남겨둔 것과 같은 종류의 이연.

## 결정 2: 세션 쿠키 메커니즘을 그대로 재사용한다 — JWT 불필요

사용자가 "쿠키 세션 유지가 되는지, JWT 등 다른 방식이 필요한지" 질문했다. 답: **필요 없다.**

### 근거

세션 쿠키는 프론트엔드가 아니라 `apps/api`가 발급하고 소유한다. 브라우저가 크로스 오리진 요청에 쿠키를 실을지는 `SameSite` 속성이 결정하는데, 이는 "정확히 같은 오리진인가"가 아니라 "**같은 사이트**(같은 최상위 등록 도메인, eTLD+1)인가"를 기준으로 판단한다. `apps/web`과 `apps/admin`이 프로덕션에서 같은 도메인의 서로 다른 서브도메인(예: `온설.app` vs `admin.온설.app`)이 되는 한 둘은 같은 사이트이고, 로컬 개발에서는 `localhost`로 호스트명이 아예 동일해 포트 차이와 무관하게 같은 사이트로 취급된다. 따라서 `SameSite=Lax`(현재 비프로덕션 설정)로도 두 앱 사이에 쿠키가 정상적으로 오간다 — 실제로 Chrome에서 `apps/web`에 로그인된 세션이 별도 로그인 없이 `apps/admin`에서도 그대로 인식되는 것을 확인했다(단일 운영자 계정 기준).

바뀌어야 했던 건 **CORS뿐**이다 — 자격증명 포함 요청은 브라우저가 정확한 오리진을 CORS 응답에서 확인해야 허용하므로, `CORS_ORIGIN`을 단일 URL에서 콤마 구분 목록으로 바꿨다(`apps/api/src/config/env.schema.ts`).

## 결정 3: `apps/admin`은 로그인 화면만 자체적으로 두고, 인증 로직 자체는 재사용

`apps/web`의 `ServiceNav`/회원가입/Google OAuth 진입점은 가져오지 않는다 — 관리자 계정은 이미 존재하는 계정이라 가입 흐름이 필요 없고, Google 로그인도 이 앱엔 불필요하다. 대신 이메일/비밀번호 로그인 폼만 화면에 인라인으로 두고, 같은 `POST /auth/login`을 호출해 같은 세션 쿠키를 발급받는다.

## 결정 4: `apps/web`과 공유 패키지를 만들지 않는다

`apiFetch`, `ApiError`, `formatTimestamp`, `ActionConfirmDialog` 같은 범용 조각들은 `apps/admin`에 독립적으로 복사해 넣었다 — `packages/*` 공유 패키지를 새로 만드는 인프라 비용이, 지금 규모(페이지 하나, 헬퍼 몇 개)의 중복보다 크다고 판단. `apps/admin`이 섹션을 더 늘려서 중복이 실제로 아프기 시작하면 그때 추출을 재고한다.

## 결정 5: `WEB_PUBLIC_URL` 신규 환경변수

`CORS_ORIGIN`이 다중 오리진 목록이 되면서, 기존에 Google OAuth 콜백의 로그인 후 리다이렉트 대상(`${CORS_ORIGIN}/today`)으로 그 값을 재사용하던 코드가 깨졌다(배열을 문자열에 꽂으면 `http://localhost:3000,http://localhost:3002/today` 같은 값이 나옴). Google OAuth는 `apps/web` 전용 기능(관리자 앱엔 없음)이라, 리다이렉트 대상은 `CORS_ORIGIN`에서 유도할 수 없는 독립적인 값이어야 해서 `WEB_PUBLIC_URL` 환경변수를 새로 추가했다.

## 결정 6: `apps/admin`을 정적 export(`output: "export"`)로 빌드한다

사용자가 "Next.js를 쓴 게 통일성은 좋지만 굳이 필요했을까"라는 의문을 제기했고, 대안(Vite SPA)과의 트레이드오프를 논의했다. Next.js의 정적 export 모드가 걱정의 절반(배포 인프라 단순함)을 코드 변경 없이 해결해준다는 걸 확인해 적용했다.

### 근거

`apps/admin`은 전부 클라이언트 컴포넌트이고 `cookies()`(next/headers), Server Actions, Route Handler, 기본 이미지 최적화 로더 중 어느 것도 쓰지 않는다 — 정적 export의 미지원 기능 목록에 걸리는 게 하나도 없어 `output: "export"`를 켜는 데 코드 변경이 필요 없었다. 이 모드에서 `next build`는 순수 정적 HTML/CSS/JS(`out/`)를 만들어, 배포 시 Node 서버(`next start`)가 필요 없어진다 — 아무 정적 호스트에나 올릴 수 있음. 다만 이건 걱정의 절반만 해소한다: **배포 단순함**은 개선되지만, `next dev`의 기동 속도나 devDependencies 무게(Vite 대비)는 그대로다 — 그 부분은 Next.js를 쓰는 한 못 줄인다는 걸 명확히 하고 진행했다.

부수 변경: `output: "export"`에서는 `next start`가 의도적으로 에러를 낸다(Next.js 자체 안내: "Use npx serve@latest out instead") — `package.json`의 `start` 스크립트를 `serve out -l 3002`로 바꿈(`serve`를 devDependency로 추가).

`trailingSlash: true`(정적 호스트에서 다중 라우트일 때 rewrite 규칙 없이 서빙되게 해주는 옵션)는 지금은 라우트가 `/` 하나뿐이라 효과가 없어 넣지 않았다 — 실제로 두 번째 섹션/라우트가 생길 때 같이 켜기로 함.

## 산출물

- `apps/admin/` — 신규 Next.js 앱(로컬 3002 포트). `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`(Storybook 없음), `postcss.config.mjs`, `vitest.config.mts`/`vitest.setup.ts`, `.env.example`/`.env.local`. `app/AdminReview.tsx`(자체 헤더 + 인라인 로그인 폼 + 신고 검토 목록), `app/useAdminReview.ts`, `app/lib/{api.ts, format.ts, auth/, admin/, query/, test-utils.tsx}`, `app/components/shared/ActionConfirmDialog.tsx`, 테스트.
- `apps/web/app/admin/`, `apps/web/app/lib/admin/` — 삭제. 공개 사이트에 관리자 코드가 전혀 남지 않음.
- `apps/api/src/config/env.schema.ts` — `CORS_ORIGIN` 배열화, `WEB_PUBLIC_URL` 추가. `apps/api/src/auth/auth.controller.ts` — Google OAuth 콜백 리다이렉트를 `WEB_PUBLIC_URL` 기준으로 수정.
- `apps/api/AGENTS.md`(CORS/멀티 오리진 섹션 추가), `apps/admin/AGENTS.md`(신규), 루트 `AGENTS.md`(워크스페이스 레이아웃에 `apps/admin` 추가).
- `apps/admin/next.config.ts`(`output: "export"`), `apps/admin/package.json`(`start` 스크립트를 `serve out -l 3002`로, `serve` devDependency 추가) — 결정 6.

## 검증

- `pnpm --filter api lint/typecheck/test(53)/build`, `pnpm --filter web lint/typecheck/test(64)/build`, `pnpm --filter admin lint/typecheck/test(13)/build` 모두 통과. `apps/web`의 빌드 라우트 목록에서 `/admin`이 사라졌고, `apps/admin`의 빌드 라우트는 `/` 하나뿐임을 확인. `pnpm --filter admin build`가 `out/`에 정적 파일을 생성하고, `pnpm --filter admin start`(`serve out -l 3002`)로 그걸 실제로 서빙해 `curl`로 200 확인.
- 세 서버(`apps/api:8080`, `apps/web:3000`, `apps/admin:3002`)를 동시에 로컬에서 띄우고 실제 Chrome으로 검증: (1) `apps/web`에서 이미 로그인된 세션으로 `apps/admin`(:3002)에 접속하니 별도 로그인 없이 즉시 관리자 화면이 인식됨 — 같은 사이트 쿠키 공유가 실제로 작동함을 확인. (2) `apps/admin`에서 로그아웃 → 인라인 로그인 폼 표시 확인. (3) 테스트 계정으로 `apps/admin`의 로그인 폼에 직접 이메일/비밀번호를 입력해 크로스 오리진 `POST /auth/login`을 실제로 실행 → 성공 → 신고 검토 화면 전환까지 확인(CORS가 실제로 두 오리진을 다 허용하는지는 curl로는 검증 불가능하므로 반드시 브라우저로 확인해야 했던 부분). 콘솔에 CORS 관련 에러 없음.
- 테스트 계정/화이트리스트 항목은 확인 후 정리함.
