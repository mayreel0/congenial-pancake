# 온설 Storybook 위치 결정 기록

## 배경

`docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md`의 결정 4가 "Storybook은 admin에 따로 안 두고 apps/web에 그대로 둔다, `ActionConfirmDialog.stories.tsx`는 import 경로만 `ui/ActionConfirmDialog`로 바꾼다"였다. 사용자가 이걸 재검토하며 세 가지를 순서대로 제기했다: (1) admin에도 Storybook을 설치해야 하는지, (2) 아니면 admin을 안 중요하게 보고 web만 유지할지, (3) 최종적으로 — Storybook 인스턴스 자체를 `apps/web`에서 완전히 분리해 `apps/storybook`으로 만들고, 스토리 파일은 각자의 컴포넌트 옆에 그대로 둔 채 glob으로 스캔하는 방식.

## 결정: 전용 `apps/storybook` 앱으로 Storybook 인스턴스를 분리한다

`apps/web`은 이제 Storybook을 전혀 실행하지 않는다(`.storybook/`, `storybook`/`build-storybook` 스크립트, Storybook 런타임 의존성 전부 제거). 스토리 파일은 그대로 컴포넌트 옆에 둔다 — `apps/web/app/**/*.stories.tsx`(web 전용 컴포넌트), `packages/ui/src/*.stories.tsx`(공유 컴포넌트). `apps/storybook/.storybook/main.ts`의 `stories` glob이 두 위치를 모두 가리킨다.

### 근거

이전 방식(스토리 파일만 옮기고 실행기는 web에 유지)도 기술적으로는 동작했지만, 사용자가 지적한 대로 Storybook의 `package.json`/스크립트/의존성이 여전히 `apps/web` 소유로 남아있어 "왜 web이 이걸 갖고 있지"라는 위화감이 완전히 해소되지 않았다. `apps/storybook`을 web/admin과 동급의 세 번째 앱으로 두면 Storybook은 정말로 "web도 admin도 아닌, 이 모노레포의 시각적 컴포넌트를 문서화하는 도구"가 된다. 스토리 파일 자체는 옮기지 않고 컴포넌트 옆에 남겨(discoverability, "컴포넌트 옆에 스토리가 있다"는 관례 유지), Storybook 앱은 여러 위치를 glob으로 스캔하기만 한다.

## 발견한 두 가지 기술적 함정 (둘 다 "빌드는 성공하는데 조용히 깨지는" 종류)

1. **Vite 개발 서버의 모노레포 바깥 경로 서빙 제한**: 걱정했던 문제였지만, 실제로 `pnpm --filter storybook-app storybook`을 띄우고 `packages/ui`와 `apps/web` 양쪽의 스토리를 `curl`로 직접 요청해본 결과 문제없이 200을 반환함을 확인 — Storybook의 Vite 설정이 이미 모노레포 루트를 허용 범위에 포함하고 있었다.
2. **Tailwind CSS가 전혀 처리되지 않음**: `apps/storybook`은 `apps/web`/`apps/admin`과 달리 자체 `postcss.config.mjs`도 `tailwindcss`/`@tailwindcss/postcss` 의존성도 없었다 — 이전엔 Storybook이 `apps/web` 안에 있어서 그 설정을 암묵적으로 물려받았지만, 별도 앱으로 분리하면서 이게 빠졌다. 빌드는 에러 없이 성공했고, `--theme` 커스텀 프로퍼티(`--color-primary` 등)는 `@theme inline` 블록이 일반 CSS라 그대로 통과했지만, **Tailwind 유틸리티 클래스(`.bg-primary`, `.z-30` 등)는 전혀 생성되지 않았다** — 즉 모든 컴포넌트가 스타일 없이 깨진 채로 렌더링될 뻔했다. `pnpm --filter storybook-app build-storybook` 성공만으로는 이걸 알 수 없었다 — 빌드된 CSS 파일을 직접 열어 `z-30`처럼 `packages/ui`에만 있는 클래스가 실제로 존재하는지 확인하고 나서야 발견했다. `postcss.config.mjs` + 의존성을 추가한 뒤 다시 확인해 해결을 검증했다.

## 부수 발견 및 수정: `packages/ui`에 lint 스크립트가 아예 없었음

PR #78(공유 패키지 추출) 때 빠뜨린 부분 — `packages/ui/package.json`에 `lint` 스크립트를 추가하고 `eslint.config.mjs`를 새로 만들었다. `eslint-config-next`를 재사용했는데(이 패키지는 Next 앱이 아닌데도), pages/app 라우터가 없다는 무해한 경고가 계속 떠서 `@next/next/no-html-link-for-pages` 규칙만 껐다(그 외 규칙은 일반적인 React/TS 위생 규칙이라 그대로 유용함). `apps/storybook`도 같은 이유로 같은 규칙을 껐다.

## 실제 렌더링 확인 중 발견한 세 가지 추가 문제

Storybook을 옮긴 뒤 사용자가 "CSS가 제대로 안 먹히는 것 같다"고 지적해 실제 브라우저로 다시 검증했다. 이번엔 Tailwind 자체가 아니라 세 가지 다른 문제였다:

1. **Geist 폰트가 전혀 로드되지 않고 있었다 — 이번 라운드 이전부터, `v1`부터 있던 문제.** `apps/web/app/layout.tsx`는 `next/font/google`로 Geist를 로드해 `<html>`에 CSS 변수 클래스를 건다. Storybook은 그 `layout.tsx`를 애초에 렌더링한 적이 없어서(컴포넌트 하나만 격리해서 보여주는 도구이므로), `--font-geist-sans`가 한 번도 정의된 적이 없었고 모든 스토리가 시스템 폰트로 대체 렌더링되고 있었다. 오래 못 알아챈 이유: 한글 텍스트는 Geist가 라틴 문자 전용 폰트라 애초에 그 글리프를 안 가지고 있어서, Geist가 로드되든 안 되든 한글 렌더링에는 차이가 없었다(그래서 한글 텍스트뿐인 `ActionConfirmDialog`는 멀쩡해 보였다) — 영어/숫자가 섞인 `LandingHero` 같은 컴포넌트에서만 차이가 드러났다. `preview.tsx`에 `next/font/google` 로딩을 추가해 해결.
2. **폰트를 wrapper `<div>`에 걸었더니 그래도 안 먹혔다.** `globals.css`의 `@theme inline`이 `--font-sans: var(--font-geist-sans)`를 `:root`에 선언하는데, 커스텀 프로퍼티 값 안의 `var()` 참조는 그게 나중에 소비되는 지점이 아니라 **그 커스텀 프로퍼티 자신이 선언된 지점(`:root`)의 캐스케이드**를 기준으로 해석된다. 즉 `--font-geist-sans`를 body 밑의 wrapper div에만 걸면 `:root`에서는 여전히 미정의라 `--font-sans`가 깨진 채로 남는다 — `layout.tsx`가 이 클래스를 `<div>`가 아니라 `<html>` 자체에 거는 이유가 바로 이것. `document.documentElement.classList.add(...)`로 실제 `<html>`에 걸도록 수정.
3. **배경색이 계산은 맞는데 화면엔 흰 배경만 보였다.** `layout.tsx`는 `<html>`에 `h-full`, `<body>`에 `min-h-full flex flex-col`도 건다 — Storybook은 컴포넌트 하나만 격리해서 그리므로 body 높이가 그 컴포넌트의 자연스러운 컨텐츠 높이만큼만 생기고, 뷰포트의 나머지 영역은 우리 앱의 배경색이 아니라 브라우저/Storybook 기본 배경(흰색)으로 남는다 — `getComputedStyle`로는 색상 값 자체가 정확히 나와서(예: 다크 테마의 `#151816`) 착시를 일으켰다. `h-full`/`min-h-full`도 같은 데코레이터에서 `<html>`/`<body>`에 직접 걸도록 추가.

## 부수 발견 및 정리: 실제로 안 쓰이는 컴포넌트 3개가 스토리로 남아있었음

`ActivitySummary`, `NoteCard`, `ReplyCard`(전부 `apps/web/app/today/components/`)는 자기 자신과 자기 스토리 파일 말고는 아무 데서도 import되지 않는 죽은 코드였다 — 초기 프로토타입/리디자인 라운드(`docs/superpowers/plans/2026-08-17-onseol-today-redesign.md`)의 유물로, `/today`가 실제 API 연동 버전으로 교체되면서 컴포넌트 자체는 안 쓰이게 됐는데 스토리만 정리가 안 돼 남아있었다. "Storybook에서 실제 UI랑 너무 다르다"는 지적의 상당 부분이 사실 이것 때문이었다 — 애초에 지금 렌더링되는 실제 화면이 아니었다. 컴포넌트 3개 + 스토리 3개, 총 6개 파일을 통째로 삭제했다(다른 어디서도 참조 안 됨을 grep으로 확인 후).

## 부수 발견 및 수정: `apps/web/app` 자기 자신의 디렉터리도 자동으로 스캔되지 않음

`LandingHero`를 실제 `web` 화면과 나란히 비교해달라는 요청에 응하다가, 사용자가 직접 `.text-accent`가 Storybook에서 안 먹힌다고 지적했다. `text-accent`는 `apps/web/app/components/landing/*`에서만 쓰이고 `packages/ui`에는 없는 클래스 — 빌드된 CSS를 grep해보니 정말 없었다. 원인: `apps/storybook`는 `apps/web/app/globals.css`를 그대로 import하고 있었는데, Tailwind v4의 자동 콘텐츠 감지는 그 CSS 파일이 물리적으로 위치한 디렉터리(`apps/web/app`)조차 자동으로 스캔해주지 않는다 — **다른 앱의 별도 Tailwind/PostCSS 인스턴스로 컴파일되는 순간**, 그 CSS 파일 자신의 디렉터리도 명시적 `@source` 없이는 커버되지 않는다. `packages/ui/src`는 이미 명시적으로 `@source` 해뒀기 때문에 `.bg-primary`(양쪽에서 다 쓰임)가 "잘 되는 것처럼" 보였던 것뿐 — 이게 이전 검증에서 놓친 거짓 음성(false negative)이었다.

`apps/storybook/.storybook/globals.css`(신규)를 만들어 `apps/web/app/globals.css`를 import하면서 `@source "../../web/app";`를 추가하고, `preview.tsx`의 import를 이 파일로 바꿔 해결. 수정 후 재빌드해 `.text-accent{color:var(--accent)}`가 실제로 생성됨을 grep으로 확인했고, `apps/web/app/components/landing/*`에서 쓰이는 클래스명 64개 전수 조사로도 전부 존재함을 재확인했다. 브라우저에서 실측 비교(`getComputedStyle`)로도 `--accent`/`--background` 값이 라이트·다크 테마 양쪽에서 `apps/web` 실제 페이지와 `apps/storybook`이 완전히 동일함(`#7d5f4f`/`#d29a78`)을 확인했다.

부수적으로 확인한 것: `LandingHero`가 실제 화면과 "다르게 보인다"고 느껴졌던 부분 중 상당수는 CSS 버그가 아니라, Storybook은 `LandingHero` 컴포넌트 하나만 격리해서 보여주는 반면 실제 `/`(랜딩) 페이지는 `LandingHero`를 감싼 `LandingPage`가 헤더 네비게이션·통계 카드 3개·최근 활동 카드까지 같이 렌더링하기 때문 — 이건 Storybook이 컴포넌트를 격리해서 보여준다는 원래 목적상 당연한 차이이므로 버그가 아니다. 또한 Storybook 툴바의 테마 기본값이 `light`인데 사용자 브라우저는 OS가 다크 모드라 실제 사이트가 기본적으로 다크로 뜨는 것도 "달라 보임"의 일부였다 — 툴바에서 테마를 전환하면 두 쪽 다 동일한 색을 낸다.

## 산출물

- `apps/storybook/`(신규): `package.json`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `.storybook/{main.ts, preview.tsx}`.
- `apps/web`: `.storybook/` 삭제, `package.json`에서 Storybook 런타임 의존성/스크립트 제거(단, 자기 소유 스토리 파일이 타입체크/린트되도록 `@storybook/nextjs-vite`, `storybook`, `eslint-plugin-storybook`은 유지).
- `packages/ui`: `ActionConfirmDialog.stories.tsx` 신규(컴포넌트 옆에 위치), `package.json`/`eslint.config.mjs` 신규(lint 스크립트 추가).

## 검증

- `pnpm --filter {ui,web,admin,storybook-app} lint/typecheck`, `pnpm --filter {web,admin} test/build` 모두 통과.
- `pnpm --filter storybook-app build-storybook` 성공 후 산출물에서 5개 스토리(`ActionConfirmDialog`, `ActivitySummary`, `ReplyCard`, `NoteCard`, `LandingHero` — web 소유 4개 + 공유 1개) 전부 포함됨을 파일 목록으로 확인.
- **CSS 실증 (2회)**: 처음엔 Tailwind 미처리로 `z-30`이 없음을 발견 → PostCSS 설정 추가 → 재빌드 후 `.z-30{z-index:30}`, `.bg-primary{background-color:var(--primary)}`가 실제로 생성됨을 grep으로 재확인.
- `pnpm --filter storybook-app storybook`(dev 서버) 기동 후 공유 스토리·web 스토리 양쪽을 실제 HTTP 요청(`curl .../iframe.html?id=...`)으로 200 확인 — 정적 빌드 성공만으론 알 수 없는 dev 서버의 모노레포 바깥 경로 서빙 여부를 직접 검증.
