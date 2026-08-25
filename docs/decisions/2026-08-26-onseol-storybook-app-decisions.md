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

## 산출물

- `apps/storybook/`(신규): `package.json`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `.storybook/{main.ts, preview.tsx}`.
- `apps/web`: `.storybook/` 삭제, `package.json`에서 Storybook 런타임 의존성/스크립트 제거(단, 자기 소유 스토리 파일이 타입체크/린트되도록 `@storybook/nextjs-vite`, `storybook`, `eslint-plugin-storybook`은 유지).
- `packages/ui`: `ActionConfirmDialog.stories.tsx` 신규(컴포넌트 옆에 위치), `package.json`/`eslint.config.mjs` 신규(lint 스크립트 추가).

## 검증

- `pnpm --filter {ui,web,admin,storybook-app} lint/typecheck`, `pnpm --filter {web,admin} test/build` 모두 통과.
- `pnpm --filter storybook-app build-storybook` 성공 후 산출물에서 5개 스토리(`ActionConfirmDialog`, `ActivitySummary`, `ReplyCard`, `NoteCard`, `LandingHero` — web 소유 4개 + 공유 1개) 전부 포함됨을 파일 목록으로 확인.
- **CSS 실증 (2회)**: 처음엔 Tailwind 미처리로 `z-30`이 없음을 발견 → PostCSS 설정 추가 → 재빌드 후 `.z-30{z-index:30}`, `.bg-primary{background-color:var(--primary)}`가 실제로 생성됨을 grep으로 재확인.
- `pnpm --filter storybook-app storybook`(dev 서버) 기동 후 공유 스토리·web 스토리 양쪽을 실제 HTTP 요청(`curl .../iframe.html?id=...`)으로 200 확인 — 정적 빌드 성공만으론 알 수 없는 dev 서버의 모노레포 바깥 경로 서빙 여부를 직접 검증.
