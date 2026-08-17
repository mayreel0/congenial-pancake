# 모바일 `/today` 입력/viewport 수정 기록

## 배경

실기기 모바일 Chrome에서 포트포워딩으로 `/today`를 확인했을 때 아래 문제가 보고되었다.

- 입력을 해도 `보내기` 버튼이 disabled처럼 보였다.
- 모바일 Chrome의 주소창, 탭 영역 영향으로 상단에 빈 공간이 크게 느껴졌다.
- 입력창을 눌러 키보드가 올라오면 화면 높이가 줄어든 만큼 시각적 빈 공간도 줄어드는 편이 자연스럽다.
- 모바일에서도 PC처럼 입력창 줄이 늘어날 때 아래로 밀기보다 위쪽으로 확장되는 감각이 필요하다.

## 원인 판단

`RequestComposer`는 기존에 버튼 활성화 여부를 부모 state의 `value` prop만 보고 판단했다. 일반 테스트의 `change` 이벤트에서는 문제가 드러나지 않았지만, 모바일 입력/IME/composition 환경에서는 실제 textarea에 글자가 보이는 순간과 부모 state가 반영되는 순간이 어긋날 수 있다. 이 경우 사용자는 글자를 입력했는데도 버튼이 disabled처럼 보일 수 있다.

모바일 상단 빈 공간은 `100vh` 기준 레이아웃이 브라우저 주소창과 키보드에 맞춰 변하는 visual viewport를 충분히 반영하지 못해서 생길 수 있다.

포트포워딩으로 `tttwg.iptime.org` 같은 외부 도메인을 통해 Next.js dev 서버에 접근하면, HTML은 200으로 내려와도 `_next/static` dev 리소스가 cross-origin dev resource 정책에 막힐 수 있다. 이 경우 React client bundle이 붙지 않아 입력해도 버튼 상태가 바뀌지 않는 것처럼 보인다.

## 수정

- `RequestComposer`가 로컬 입력값을 즉시 보관하고, 버튼 활성화 여부도 로컬 입력값 기준으로 판단하게 했다.
- `onChange`에서 로컬 입력값과 부모 `onChange`를 함께 갱신한다. 테스트는 모바일 브라우저의 `input` 이벤트 경로도 검증한다.
- 제출 시 로컬 입력값을 `onSubmit(value)`로 넘긴다.
- `useOnseolPrototype.submitRequest`는 optional body override를 받아 부모 state 반영이 늦어도 제출값을 잃지 않게 했다.
- 모바일 viewport 기준은 `100vh` 대신 `100dvh`를 사용한다.
- 입력창은 하단 composer row에 남겨두어 줄이 늘어날 때 위쪽으로 확장되는 구조를 유지한다.
- `next.config.ts`에 `allowedDevOrigins: ["tttwg.iptime.org"]`를 추가해 포트포워딩 도메인에서도 dev 리소스가 로드되게 했다.

## 검증 기준

- 부모 state가 아직 따라오지 않아도 textarea의 로컬 입력값만으로 `보내기`가 활성화된다.
- 모바일 입력 이벤트인 `input`으로도 `/today`의 `보내기`가 활성화된다.
- `/today` 최상위 높이 기준은 `min-h-dvh`다.
- 내부 첫 화면 높이 계산은 `100dvh`를 사용한다.

## 작업공간 정리

이 작업 전에 merge 완료된 로컬 `.worktrees/onseol-*` worktree와 대응 로컬 `codex/onseol-*` 브랜치를 정리했다. 원격 브랜치는 삭제하지 않았다.
