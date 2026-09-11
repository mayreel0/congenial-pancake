# `AdminShell`이 HOC 대신 `children`을 받는 이유

## 배경

PR #190(admin 데스크톱 사이드바)에서 `AdminNav`를 `AdminShell`로 재구성하면서, 3개 페이지(`AdminReview`/`SettingsReview`/`AccountsReview`)가 각각 `<AdminShell activePath="...">{...}</AdminShell>` 형태로 동일하게 감싸는 구조가 됐다. 리뷰 중 "이렇게 매번 똑같이 감싸는 경우 HOC(Higher-Order Component)를 쓰지 않느냐"는 질문이 나왔다.

## 결론

HOC는 오늘날에도 완전히 사라진 패턴은 아니지만, "컴포넌트 전체를 감싸는 단일하고 균일한 동작 하나"를 주입할 때만 잘 맞는다. 지금도 쓰이는 대표 사례:

- **에러 바운더리** — React가 아직 훅 기반 에러 바운더리 API를 제공하지 않아서 `withErrorBoundary(Component)` 형태가 흔함.
- **CSS-in-JS** — `styled-components`의 `styled(Component)`도 구조상 HOC.
- **`React.memo`/`forwardRef`** — 컴포넌트를 받아 새 컴포넌트를 반환하는 형태라 기술적으로 HOC 계열.
- **인증 라우트 보호** — NextAuth의 `withAuth`처럼 페이지 전체에 단일 동작만 씌우는 경우.

`AdminShell`은 이 모양에 맞지 않는다. 각 페이지가 `<main>` 하나만 넣는 게 아니라 `ActionConfirmDialog`/`Toast` 같은 서로 다른 형제 요소를 페이지마다 다르게 조합해야 한다. HOC는 감싸는 컴포넌트 하나만 슬롯으로 받을 수 있어서 이런 다중 슬롯 조합에는 `children` 기반 래퍼 컴포넌트가 더 자연스럽다. `activePath`를 `usePathname()`으로 유도하지 않고 명시적 prop으로 받는 것도 기존 관례(라우터 컨텍스트 없이 테스트 가능하게 유지) 그대로 따른 것이다.

## 참고

- 상세 논의: PR #190 설명의 "Why `AdminShell` takes `children` instead of being a HOC" 섹션.
