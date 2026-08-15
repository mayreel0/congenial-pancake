# 온설 디자인 시스템

온설 디자인 시스템은 화면을 예쁘게 꾸미기 위한 장식 목록이 아니라, 사람이든 AI 에이전트든 같은 기준으로 UI 결정을 내리게 하기 위한 작업 기준이다.

## 문서 구성

- `01-principles.md`: 온설이 지켜야 할 디자인 원칙과 피해야 할 표현
- `02-tokens.md`: 색, 글꼴, 간격, radius, shadow 같은 기본 토큰 기준
- `03-components.md`: 반복 사용될 UI 컴포넌트의 책임과 상태 기준
- `04-ai-guardrails.md`: AI가 흔히 만드는 일반적인 디자인 패턴을 막기 위한 작업 규칙
- `05-storybook-strategy.md`: Storybook을 언제, 어떤 범위로 도입할지에 대한 기준
- `06-responsive-layout.md`: PC, 태블릿, 모바일 반응형 레이아웃 기준
- `07-cross-platform-experience.md`: 웹과 앱의 사용자 경험을 일관되게 유지하는 기준

## 사용 방식

새 UI를 만들기 전에는 아래 순서로 확인한다.

1. 화면의 목적이 `01-principles.md`와 맞는지 확인한다.
2. 새 색, radius, shadow, 간격을 임의로 만들기 전에 `02-tokens.md`의 이름 체계를 따른다.
3. 이미 존재하거나 예상되는 컴포넌트는 `03-components.md`의 책임과 상태 범위 안에서 설계한다.
4. 구현 결과가 `04-ai-guardrails.md`의 금지 패턴에 걸리는지 확인한다.
5. 반복될 컴포넌트라면 Storybook story로 남길 수 있는 형태인지 확인한다.
6. 화면 단위 작업은 `06-responsive-layout.md`의 viewport 기준을 만족하는지 확인한다.
7. 앱으로 확장될 기능은 `07-cross-platform-experience.md`의 공통 경험 기준을 따른다.

## 현재 단계

현재 디자인 시스템은 문서 기준을 먼저 세우는 단계다.

다음 단계 후보는 Storybook 도입과 핵심 컴포넌트 story 작성이다. 후보 컴포넌트는 `Button`, `NoteCard`, `ReplyCard`, `ActivityStat`, `LandingPreview`다.
