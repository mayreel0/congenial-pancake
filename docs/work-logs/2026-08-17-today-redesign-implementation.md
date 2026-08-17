# `/today` 재설계 구현 기록

## 구현 범위

`/today`를 기존 all-in-one 프로토타입 화면에서 기본 문구, 순환 온설 문구, 입력창, 제출 상태 중심 화면으로 바꿨다.

## 유지한 결정

- 순환 온설은 최근 온설 캐시를 우선 사용하고, 없으면 기본 샘플을 보여준다.
- 내가 방금 작성한 온설은 순환 온설에 즉시 넣지 않는다.
- 제출은 pending, 성공, `남겨졌어요`, 입력창 비움 lifecycle을 보여준다.
- 초기 화면에는 `누군가에게 답하기` 보조 링크와 이미지 버튼을 넣지 않는다.

## 구현 메모

- 최근 온설 선택은 `getRecentNonViewerRequests`와 `getTodayEntryMessages`로 분리했다.
- 제출 lifecycle은 `useOnseolPrototype` 안에서 `requestSubmitStatus`로 관리한다.
- 중복 제출 방지는 pending 상태와 별도로 ref guard를 둔다.
- 순환 온설 전환은 `RotatingOnseolLine`과 `onseol-soft-wipe` CSS로 분리했다.
- `prefers-reduced-motion`에서는 wipe animation을 끈다.

## 검증

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
