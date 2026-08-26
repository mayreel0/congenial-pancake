# 온설 코드 정리 라운드 결정 기록

## 배경

기능 개발을 잠시 멈추고, 사용자가 요청한 5가지 원칙으로 코드베이스 전체를 리팩토링하는 라운드를 진행했다:

1. 체이닝된 삼항연산자 제거
2. 긴 if/else는 early return이나 lookup table로
3. 한 파일에 컴포넌트 여러 개 있으면 분리
4. 공통 컴포넌트로 뺄 수 있는 부분은 `packages/ui`로 추출 + Storybook 생성
5. 함수는 한 가지 일만 명확하게

`apps/web`, `apps/admin`, `apps/api-server`, `packages/ui` 전체를 대상으로 조사한 뒤(`today/prototype`은 알려진 레거시라 제외, 테스트 파일 제외), 실제 위반 사례만 골라 4개의 독립 PR로 나눴다. 일부는 Codex에게 위임했다.

## PR별 요약

1. **`refactor: AdminController.hidden()의 중복 매핑을 헬퍼로 추출`** (5번 — Codex 작성) — 요청/답장 각각의 "신고 수 조회 + DTO 변환" 블록을 `enrichWithReportCount<T, D>()` 제네릭 헬퍼로 통합. 응답 shape/값 동일.
2. **`refactor: admin 4단계 삼항연산자 → AdminStatusGate, SettingsForm 파일 분리`** (1번+3번) — `AdminReview.tsx`/`SettingsReview.tsx`가 각각 갖고 있던 동일한 4단계(loading/signedOut/forbidden/ready) 체이닝 삼항을 공용 `AdminStatusGate`(early return)로 추출. `SettingsForm`도 별도 파일로 분리 — 지연 초기화가 "같은 위치의 같은 컴포넌트는 리렌더에도 인스턴스가 유지된다"는 성질에 의존한다는 주석은 그대로 이동.
3. **`refactor: /me 페이지 컴포넌트 3개 파일 분리`** (3번 — Codex 작성) — `AnswerLogCard`/`MyAnswerLogSection`/`MePage`를 `app/<page>/components/` 컨벤션에 맞춰 분리.
4. **`feat: packages/ui에 Button/TextField 추출 + Storybook`** (4번, 이 문서) — 아래 상세.

## 결정: `Button`/`TextField`는 실제 중복이 확인된 범위만 커버한다

조사에서 발견한 정확한 중복 지점만 추출 대상으로 삼았다 — 가상의 미래 요구를 미리 설계하지 않는다는 이 프로젝트의 원칙을 그대로 따랐다:

- **`Button`**: `bg-primary` 계열(primary) 스타일만 존재 — `apps/web/app/me/page.tsx`(로그인 CTA), `apps/web/app/me/components/MyAnswerLogSection.tsx`(답변 남기기 CTA), `apps/web/app/components/navigation/LandingHeader.tsx`(2곳), `apps/admin/app/settings/SettingsForm.tsx`/`apps/admin/app/components/LoginForm.tsx`(제출 버튼), `apps/web/app/login/page.tsx`(제출 버튼) — 총 7곳. `outline`/`ghost` 같은 다른 변형은 지금 2곳 이상 중복된 사례가 없어서 만들지 않았다 — 필요해지면 그때 추가.
- **`TextField`**: `apps/web/app/login/page.tsx`, `apps/admin/app/components/LoginForm.tsx`, `apps/admin/app/settings/SettingsForm.tsx` 3곳.

## 결정: `Button`은 `href` 유무로 `<Link>`/`<button>`을 둘 다 렌더링한다

발견된 중복 중 일부는 `<button type="submit">`(폼 제출), 일부는 `<Link href="...">`(내비게이션 CTA)였는데 — 시각적으로는 완전히 같은 스타일이다. 두 형태를 다 커버하려고 `href` prop이 있으면 Next `Link`를, 없으면 `<button>`을 렌더링하는 방식을 택했다(풀 `asChild`/Radix Slot 패턴 대신 가장 단순한 형태). 이 때문에 `packages/ui`가 처음으로 `next`를 (peer)dependency로 갖게 됐다 — 지금까지는 순수 React만 썼는데, `Button`이 Next 전용 컴포넌트(`next/link`)를 쓰는 유일한 예외.

## 결정: `TextField`의 라벨 스타일은 `hint` 유무로 결정한다

실제 사용처를 보면 라벨 스타일이 두 가지였다 — 로그인류 필드는 `text-sm text-muted`(연한 라벨), `apps/admin`의 설정 필드는 `text-sm font-semibold text-foreground`(굵은 라벨) + 별도 힌트 텍스트. 별도의 `labelVariant` prop을 만드는 대신, "힌트가 있으면 굵은 라벨"이라는 지금의 실제 상관관계를 그대로 API로 삼았다 — 지금 존재하는 모든 호출부에 정확히 들어맞고, prop 표면을 하나 줄인다.

## 결정: 너비 충돌을 피하려고 `width: "full" | "compact"`로 양자택일하게 했다

`apps/admin`의 설정 입력창만 `w-40`(좁음), 나머지는 `w-full`. 이 저장소엔 `tailwind-merge`/`clsx` 같은 클래스 충돌 해결 라이브러리가 전혀 없어서, `className` prop으로 자유롭게 추가/덮어쓰기를 허용하면 `w-full`과 `w-40`이 동시에 클래스 목록에 들어갈 때 실제로 어느 쪽이 이기는지가 (엘리먼트에 나열된 순서가 아니라) Tailwind 빌드가 CSS 규칙을 생성한 순서에 좌우되는 정의되지 않은 동작이 된다. 이 프로젝트엔 그런 유틸리티를 새로 추가할 이유가 없다고 판단해, 대신 두 값 중 하나를 완전히 대체하는 `width` prop을 만들어 충돌 자체를 원천 차단했다.

## 검증

- `pnpm --filter {ui,web,admin} lint/typecheck`, `pnpm --filter {web,admin} test`(67+19, 전부 기존 테스트 그대로 통과 — 순수 리팩토링 확인), `pnpm --filter {web,admin} build` 모두 통과.
- 빌드된 CSS에서 `Button`/`TextField`가 쓰는 클래스(`disabled:cursor-not-allowed`, `outline-none` 등)가 `apps/web`/`apps/admin` 양쪽 다 실제로 생성됨을 grep으로 확인 — `packages/ui/src`는 이미 두 앱의 `@source`에 포함돼 있어 새 디렉터리 설정은 필요 없었다.
- Storybook(`apps/storybook-app`)에서 `Button`(Default/Disabled/FullWidth/Small/AsLink)과 `TextField`(Default/WithHint/Required) 스토리를 실제로 렌더링해 시각 확인 — `AsLink` 스토리가 실제로 `<a href="/answer">`를 렌더링하는지 DOM에서 직접 확인(iframe 안에 Storybook 자체의 숨겨진 `sb-preparing-docs` 오버레이 엘리먼트가 같이 있어서 초기 셀렉터 쿼리가 혼란을 줬는데, 크기 0×0의 Storybook 내부 아티팩트임을 확인하고 실제 렌더링 엘리먼트를 다시 찾아 검증).
