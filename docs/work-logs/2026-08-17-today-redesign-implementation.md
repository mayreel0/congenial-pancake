# `/today` 재설계 구현 기록

## 구현 범위

`/today`를 기존 all-in-one 프로토타입 화면에서 기본 문구, 순환 온설 문구, 입력창, 제출 상태 중심 화면으로 바꿨다.

## 유지한 결정

- 순환 온설은 최근 온설 캐시를 우선 사용하고, 없으면 기본 샘플을 보여준다.
- 내가 방금 작성한 온설은 순환 온설에 즉시 넣지 않는다.
- 제출은 pending, 성공, 입력창 비움 lifecycle을 보여준다.
- 성공 피드백은 입력창 아래 인라인 문구가 아니라 레이아웃을 밀지 않는 toast로 보여준다.
- 초기 화면에는 `누군가에게 답하기` 보조 링크와 이미지 버튼을 넣지 않는다.

## 구현 메모

- 최근 온설 선택은 `getRecentNonViewerRequests`와 `getTodayEntryMessages`로 분리했다.
- 제출 lifecycle은 `useOnseolPrototype` 안에서 `requestSubmitStatus`로 관리한다.
- 중복 제출 방지는 pending 상태와 별도로 ref guard를 둔다.
- 순환 온설 전환은 `RotatingOnseolLine`과 `onseol-soft-wipe` CSS로 분리했다. 문구 변경 시 element key를 바꿔 animation이 다시 시작되게 한다.
- 순환 온설 문구는 모바일에서 길이가 바뀌어도 입력창 위치가 흔들리지 않도록 2줄 기준 고정 높이와 줄 제한을 둔다.
- `prefers-reduced-motion`에서는 wipe animation을 끈다.

## QA 반영 메모

- `남겨졌어요`는 표현이 어색하고, 인라인으로 렌더링하면 성공 상태에서 UI 높이가 바뀐다.
- 성공 문구는 `온설을 남겼어요`로 바꾸고, 2초 후 사라지는 toast로 처리한다.
- toast는 fixed 위치에 렌더링해 입력 영역과 활동 요약의 레이아웃을 바꾸지 않는다.
- 순환 온설은 전환 CSS만 두면 React가 같은 DOM node의 텍스트만 바꿀 수 있어 animation이 체감되지 않을 수 있다. 문구 변경 시 key를 바꿔 전환 animation을 재시작한다.

## 검증

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
