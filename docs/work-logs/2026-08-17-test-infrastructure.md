# 테스트 인프라 도입 기록

## 배경

`/today` 재설계 구현 전에 테스트 인프라를 먼저 도입하기로 했다. 앞으로 구현할 기능은 시각 요소뿐 아니라 pending, 성공, 입력 초기화, 중복 제출 방지 같은 상태 흐름이 중요해진다. 이 흐름은 수동 확인만으로 반복 검증하기 어렵기 때문에, 작은 테스트 기반을 먼저 만든다.

## 결정

- 테스트 러너는 Vitest를 사용한다.
- React 컴포넌트 테스트는 React Testing Library를 사용한다.
- DOM 환경은 jsdom을 사용한다.
- DOM matcher는 `@testing-library/jest-dom/vitest`를 setup file에서 불러온다.
- 사용자 입력 테스트를 위해 `@testing-library/user-event`를 devDependency로 포함한다.
- TSX 변환과 React 테스트 안정성을 위해 `@vitejs/plugin-react`를 Vitest config에 포함한다.
- `pnpm test`는 CI 친화적인 단발 실행인 `vitest run`으로 둔다.
- 개발 중 반복 실행은 `pnpm test:watch`로 둔다.

## 범위

이번 PR은 테스트 인프라와 최소 smoke 테스트만 포함한다.

- 순수 함수 테스트: `getPriorityRequests`
- React 렌더링 테스트: `RequestComposer`

`/today`의 순환 온설, pending lifecycle, soft vertical wipe 동작은 다음 구현 PR에서 테스트와 함께 다룬다.

## 확인한 실패와 처리

처음 `pnpm test`를 실행했을 때 테스트 스크립트가 없어 실패했다. 이후 `test` 스크립트와 Vitest 설정을 추가했다.

처음 `vitest.config.ts`를 사용했을 때 Vite가 CommonJS로 설정 파일을 읽으며 ESM syntax 경고를 냈다. 설정 파일을 `vitest.config.mts`로 바꾸어 경고 없이 실행되게 했다.

`pnpm build`는 샌드박스 네트워크 제한에서 `next/font`가 Google Fonts를 가져오지 못해 실패했다. 네트워크 허용 상태에서 다시 실행했을 때 빌드는 통과했다.

## 검증

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
