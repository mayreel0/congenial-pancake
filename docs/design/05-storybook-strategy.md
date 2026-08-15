# Storybook 도입 전략

## 결론

Storybook은 온설에 도입할 가치가 있다.

다만 첫 디자인 시스템 PR에서는 설치하지 않고, 문서 기준을 먼저 세운다. 이유는 현재 문제의 핵심이 “컴포넌트 개발 도구가 없음”보다 “디자인 판단 기준이 없음”에 가깝기 때문이다.

## Storybook을 쓰는 이유

Storybook은 컴포넌트를 앱 화면과 분리해서 볼 수 있게 한다. 이 점은 온설에 특히 중요하다.

- 요청 카드, 답장 카드, 작성 입력창을 상태별로 비교할 수 있다.
- 긴 한국어 문장, 빈 상태, 신고로 숨겨진 상태, 답변 부족 상태를 독립적으로 확인할 수 있다.
- 컴포넌트가 앱 라우트나 백엔드 없이도 렌더링되는지 확인할 수 있다.
- Storybook 테스트 러너와 interaction test를 붙이면 상태 변화도 검증할 수 있다.
- 시각 회귀 테스트를 붙이면 “조금씩 AI 기본 디자인으로 돌아가는 문제”를 잡을 수 있다.

## 도입 순서

### 1단계: 문서 기준

이번 PR 범위다.

- 디자인 원칙
- 디자인 토큰 기준
- 컴포넌트 기준
- AI 가드레일
- Storybook 도입 전략

### 2단계: Storybook 설치

다음 PR 후보다.

- Storybook을 Next.js/React 프로젝트에 맞춰 설치한다.
- `pnpm storybook`, `pnpm build-storybook` 스크립트를 추가한다.
- 전역 CSS와 Tailwind 스타일이 Storybook에서도 동일하게 적용되게 한다.
- 라이트/다크 모드 전환을 story에서 확인할 수 있게 한다.

### 3단계: 핵심 story 작성

초기 story 후보:

- `Button`
- `ActivityStat`
- `NoteCard`
- `ReplyCard`
- `LandingPreview`

각 story는 최소한 기본 상태, 긴 한국어 텍스트, 모바일 폭에서의 표시, 다크모드 표시를 포함한다.

### 4단계: 테스트 연결

컴포넌트가 늘어난 뒤 도입한다.

- render test
- interaction test
- accessibility check
- visual regression test

초기에는 모든 테스트를 한 번에 붙이지 않는다. Storybook이 컴포넌트 기준을 보여주는 역할을 먼저 하게 한다.

## 도입하지 않을 이유가 생기는 경우

아래 조건이면 Storybook 도입을 늦춘다.

- 컴포넌트 수가 적고 대부분 한 화면에서만 쓰인다.
- 앱 흐름이 아직 자주 바뀌어 story 유지 비용이 더 크다.
- 디자인 토큰과 컴포넌트 경계가 아직 정리되지 않았다.

현재 온설은 곧 요청/답장/작성/신고/내 정보 컴포넌트가 생길 예정이므로, Storybook 도입 가치가 생길 가능성이 높다.

## 참고

- Storybook component tests: https://storybook.js.org/docs/8/writing-tests/component-testing
- Storybook UI testing: https://storybook.js.org/docs/writing-tests
- Storybook browse stories: https://storybook.js.org/docs/get-started/browse-stories
