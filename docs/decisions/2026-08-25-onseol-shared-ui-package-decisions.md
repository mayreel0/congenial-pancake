# 온설 apps/web ↔ apps/admin 공유 패키지 결정 기록

## 배경

PR #77(`/admin` 분리)에서 "지금 규모에서 공유 패키지 인프라 비용이 중복보다 크다"는 이유로 `apiFetch`, `ActionConfirmDialog`, `formatTimestamp`, `QueryProvider` 등을 두 앱에 각각 복사해 넣었다(`docs/decisions/2026-08-25-onseol-admin-app-split-decisions.md`의 결정 4). 병합 후 사용자가 "web에만 있는 Storybook도 admin에 필요하지 않을까, 공통 컴포넌트/유틸/타입도 공유 패키지로 빼는 게 낫지 않을까"라고 제기했다. 실제로 대조해보니 `ActionConfirmDialog.tsx`/`QueryProvider.tsx`/`formatTimestamp`는 byte-identical, `apiFetch`/`ApiError`도 기본 URL 상수 하나만 달랐다 — 소비자(consumer)가 2개(web, admin)가 된 지금이 추출하기 딱 좋은 시점이라고 판단해 진행했다.

## 결정 1: `packages/ui`를 신규 워크스페이스 패키지로 추가한다

`pnpm-workspace.yaml`에 `packages/*` 글롭 추가. 빌드 스텝 없이 소스를 그대로 export하고(`package.json`의 `exports` 필드가 각 서브패스를 `.ts`/`.tsx` 파일에 직접 매핑), 소비하는 각 Next.js 앱이 `transpilePackages: ["ui"]`로 자기 빌드 파이프라인에 포함시켜 컴파일한다 — 별도 빌드/배포 대상이 아니라 순수 소스 공유 목적이라 이 방식이 가장 단순하다.

## 결정 2: 이관 범위 — 완전히 동일하고 안정적인 것만

- **이관함**: `apiFetch`/`ApiError`(제네릭 fetch 래퍼), `login`/`logout`/`fetchCurrentUser`/`CurrentUser`(두 앱에서 100% 동일한 구현), `ActionConfirmDialog`, `QueryProvider`, `formatTimestamp`.
- **이관 안 함**: `signup`/`googleLoginUrl`(apps/web 전용 — admin엔 가입도 Google 로그인도 없음), `useAuth`/`queries.ts`의 훅 레이어(web은 가입+구글+로그아웃 리다이렉트까지 있고 admin은 로그인/로그아웃뿐이라 실제로 모양이 다름 — 억지로 하나의 매개변수화된 훅으로 합치면 오히려 복잡해짐), `isSameCalendarDay`/`formatDayLabel`/`formatJoinedDate`(apps/web 전용 — `/today`/`/me`에서만 씀), `AdminRequestDto`/`AdminReplyDto` 같은 admin 전용 타입(web에 대응물 없음, 애초에 중복이 아님).

### 근거

"진짜 중복"(두 앱에서 지금 완전히 같고 앞으로도 갈릴 이유가 없는 것)만 추출하고, "우연히 비슷해 보이지만 실제로는 각 앱의 사정에 따라 계속 갈라질 것"은 각자 남겨둔다. 후자를 억지로 공유하면 매개변수/옵션이 늘어나며 오히려 복잡도가 커진다.

## 결정 3: 다수 소비자(consumer) 파일은 로컬 파일을 얇은 재수출(re-export)로 남긴다

`apps/web/app/lib/api.ts`(6개 이상 소비처), `apps/admin/app/lib/api.ts`(6개 소비처), `apps/web/app/lib/format.ts`(3개 소비처)는 파일 자체를 지우지 않고 `export { ... } from "ui/api"` 형태의 얇은 재수출로 남기고, apps/web은 자기만 쓰는 `signup`/`googleLoginUrl`을 같은 파일에 추가로 정의한다. 반면 소비처가 1개뿐인 것들(`apps/admin`의 `ActionConfirmDialog`, `format.ts`, `QueryProvider.tsx`)은 로컬 파일을 아예 지우고 그 하나의 소비처가 `"ui/..."`를 직접 import하도록 바꿨다. `apps/web`의 `ActionConfirmDialog`/`QueryProvider`도 소비처가 각각 2~3개뿐이라 로컬 파일을 지우고 직접 import로 바꿨다.

### 근거

재수출 shim은 "실제 구현은 하나뿐"이라는 목표를 달성하면서 다수 호출부를 건드리지 않아 이번 라운드의 diff와 리스크를 줄인다. 소비처가 1~3개뿐인 경우엔 shim을 남기는 것 자체가 불필요한 간접 레이어라 직접 import로 정리하는 쪽이 더 깔끔하다.

## 결정 4: Storybook은 옮기지 않는다 — 그대로 apps/web에 두되, 진짜 공유 컴포넌트를 문서화하게 된다

`apps/admin`에 별도 Storybook 인스턴스를 추가하지 않았다. `ActionConfirmDialog.stories.tsx`는 `apps/web`에 그대로 두고 import만 `"ui/ActionConfirmDialog"`로 바꿨다 — 이제 이 스토리가 문서화하는 컴포넌트가 web의 복제본이 아니라 admin도 실제로 쓰는 진짜 공유 소스라, "Storybook이 web에만 있어서 admin 컴포넌트는 문서화가 안 된다"는 원래 우려가 해소된다. `apps/admin`은 아직 재사용 가능한 자기만의 컴포넌트가 없어서(로그인 폼은 페이지 전용 글루 코드) 별도 Storybook을 붙일 대상 자체가 없다.

## 결정 5: Tailwind v4의 `@source` 디렉티브 필요

Tailwind v4의 자동 컨텐츠 탐지는 CSS 파일이 있는 디렉터리 트리 안쪽만 스캔한다. `packages/ui`는 `apps/web`/`apps/admin`의 디렉터리 바깥에 있어서, 아무 설정 없이는 `ActionConfirmDialog.tsx`가 쓰는 클래스(`bg-primary`, `z-30` 등)가 빌드된 CSS에 전혀 생성되지 않는다 — 빌드 자체는 에러 없이 성공하고 컴포넌트는 스타일 없이 깨진 채로 렌더링되는, 겉으로 티가 안 나는 실패 모드다. 각 앱의 `globals.css`에 `@source "../../../packages/ui/src";`를 추가해 명시적으로 스캔 대상에 포함시켰다.

## 추가 결정 (2026-08-26): `packages/ui`에서 비-UI 코드를 `packages/api-client`/`packages/utils`로 재분리

사용자가 `packages/ui`에 `api.ts`(fetch 래퍼, 로그인 함수들)가 들어있는 게 이상하다고 지적했다 — 맞는 지적이다: `ActionConfirmDialog`/`QueryProvider`만 실제 React 컴포넌트고, `api.ts`/`format.ts`는 React와 무관한 데이터 페칭/유틸 로직이다. 다음과 같이 재분리했다.

- **`packages/api-client`(신규)**: `apiFetch`, `ApiError`, `API_BASE_URL`, `CurrentUser`, `login`/`logout`/`fetchCurrentUser` — 옛 `packages/ui/src/api.ts` 전체를 그대로 이동. 패키지 이름을 `api`가 아니라 `api-client`로 지은 이유: `apps/api`(NestJS 백엔드)가 이미 자기 `package.json`에서 `"name": "api"`를 쓰고 있어서 그대로 쓰면 pnpm 워크스페이스 이름이 충돌한다(실제로 `api`로 시도했다가 `pnpm --filter api`가 두 패키지에 다 매칭되고 `tsc`가 모듈을 못 찾는 것으로 발견).
- **`packages/utils`(신규)**: `formatTimestamp`. 이름을 `util`이 아니라 `utils`(복수형)로 지은 이유: Node.js 내장 코어 모듈 이름이 `util`이라 그대로 쓰면 번들러/Node 모듈 해석 순서에 따라 내장 모듈에 가려질 수 있는 잠재적 충돌 지점이라 처음부터 피했다.
- `packages/ui`엔 이제 `ActionConfirmDialog`/`QueryProvider`만 남는다 — 이름과 실제 내용이 다시 일치한다.

두 앱 다 `package.json`에 `api-client`/`utils` 의존성 추가, `next.config.ts`의 `transpilePackages`에 두 이름 추가, import 경로를 `"ui/api"``"ui/format"` → `"api-client"``"utils"`로 변경. 소비처가 각 앱 1개(`app/lib/api.ts`, `app/lib/format.ts`/`AdminReview.tsx`)뿐이라 재수출 shim 구조는 그대로 유지했다.

## 산출물

- `packages/ui/`(신규): `package.json`, `tsconfig.json`, `src/{api.ts, ActionConfirmDialog.tsx, QueryProvider.tsx, format.ts}`.
- `pnpm-workspace.yaml` — `packages/*` 글롭 추가.
- `apps/web`, `apps/admin` 각각: `package.json`(`ui: workspace:*` 의존성), `next.config.ts`(`transpilePackages: ["ui"]`), `globals.css`(`@source`), `app/lib/api.ts`(재수출 shim), 로컬 `ActionConfirmDialog.tsx`/`QueryProvider.tsx`/(web은 `format.ts`도 부분) 삭제 및 소비처 import 경로 업데이트.

## 검증

- `pnpm --filter ui typecheck`, `pnpm --filter web lint/typecheck/test(64)/build`, `pnpm --filter admin lint/typecheck/test(13)/build`, `pnpm --filter api lint/typecheck/test(53)`(영향 없음 확인) 모두 통과.
- **CSS가 실제로 생성됐는지 직접 확인**: `z-30`이 `apps/web`/`apps/admin` 소스 어디에도 없고 오직 `packages/ui/src/ActionConfirmDialog.tsx`에만 있는 클래스임을 확인한 뒤, 두 앱의 빌드 결과물(`apps/web/.next/static/css/*.css`, `apps/admin/out/_next/static/css/*.css`) 모두에 `.z-30{z-index:30}`이 실제로 존재하는 것을 grep으로 확인 — `@source` 디렉티브가 정말 작동함을 빌드 성공 여부가 아니라 생성된 CSS 내용으로 직접 검증.
- `pnpm --filter web build-storybook` 성공, `ActionConfirmDialog.stories.tsx`가 `"ui/ActionConfirmDialog"`를 정상적으로 resolve해 번들에 포함됨을 확인.
- 실사용자가 병합 직후 로컬에서 자체적으로 API/web 서버를 이미 띄워 확인 중이라(22:24~22:37 시작), 그 세션을 방해하지 않기 위해 별도 Chrome 라이브 검증은 생략 — 위 CSS/테스트/Storybook 빌드 증거로 충분하다고 판단.
