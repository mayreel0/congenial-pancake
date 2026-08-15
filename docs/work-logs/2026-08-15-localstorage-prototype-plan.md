# 온설 localStorage 프로토타입 구현 계획 기록

## 배경

- 사용자는 localStorage 프로토타입 구현 계획 단계로 들어가겠다고 했다.
- 앞선 설계 PR에서는 프로토타입을 먼저 만들고, 이후 Storybook으로 실제 컴포넌트를 분리해 컨셉과 맞는지 확인하는 방향을 정했다.
- 이번 작업은 구현이 아니라 구현 계획 문서 작성이다.

## 계획에 반영한 기본 결정

- route는 `/today`를 기본값으로 둔다.
- 랜딩의 `웹에서 시작하기`는 `/today`로 연결한다.
- 초기 샘플 데이터는 자동 삽입한다.
- 데이터 초기화는 작은 보조 액션으로 제공한다.
- 데스크톱은 첫 구현에서 복잡한 2영역 레이아웃 대신 단일 흐름으로 시작한다.
- 신고는 프로토타입에서 즉시 숨김 처리한다.

## 계획 구조

- 도메인 타입과 seed data
- 순수 모델 helper
- localStorage storage layer
- client hook
- UI 컴포넌트
- `/today` route composition
- 랜딩 CTA 연결
- 브라우저 검증
- 한글 작업 로그와 PR 생성

## 위키 이전 포인트

- 현재 프로젝트에는 별도 테스트 러너가 없으므로, 이 구현 계획에서는 새 테스트 도구를 바로 도입하지 않는다.
- 대신 도메인 로직을 작은 순수 함수로 분리하고 `lint`, `typecheck`, `build`, 브라우저/localStorage 검증으로 확인한다.
- Storybook 도입 시점에 컴포넌트 story, interaction test, visual regression test를 같이 검토할 수 있다.
- 프로토타입의 목적은 완성된 MVP가 아니라 실제 흐름과 컴포넌트 후보 확인이다.
