# ActionConfirmDialog: 배경(backdrop) 클릭 = 취소

## 배경

`useDismissOnOutsideClick` 훅(`docs/decisions/2026-09-01-onseol-dismiss-on-outside-click-decisions.md`)을 추출한 뒤, 이걸 `ActionConfirmDialog`에도 적용할 수 있는지 질문이 나왔다. 구조적으로는 그대로 적용됨 — `ActionConfirmDialog`도 풀스크린 반투명 배경(`bg-black/40`) + 안쪽 박스라는 같은 모양이라, 안쪽 박스에 ref를 걸고 `onDismiss`를 `onCancel`로 연결하면 됨.

다만 이건 순수 리팩터링이 아니라 실제 동작 변경이다 — 지금까지는 배경을 클릭해도 아무 일도 없었고, 취소/확인 버튼을 눌러야만 닫혔다. `ActionConfirmDialog`는 `packages/ui`에 있어 `apps/web`+`apps/admin`의 모든 확인 다이얼로그(신고 확인, 방문자 설정 저장 확인, admin 복구/삭제 확인 등)에 한 번에 적용되는 변경이라, 조용히 끼워넣지 않고 확인받았다 — "네, 배경 클릭 = 취소로 추가".

## 구현

`packages/ui/src/ActionConfirmDialog.tsx`: 안쪽 박스(`w-full max-w-sm ...`)에 `useDismissOnOutsideClick<HTMLDivElement>(open, onCancel)`이 반환하는 ref를 걸었다. `open`이 `false`일 때는 컴포넌트가 `null`을 반환하지만, 훅 자체는 early return보다 먼저 호출돼야 하므로(Hooks 규칙) 함수 최상단에서 호출.

취소/확인 버튼은 안쪽 박스 안에 있으므로 버튼 클릭 시 mousedown 타겟이 ref 안에 있어 바깥-클릭 핸들러가 개입하지 않고, 각 버튼의 `onClick`이 그대로 동작한다 — 이중 호출 없음.

## 이 PR을 별도로 분리한 이유

처음엔 훅 추출과 이 변경을 한 커밋/PR(#116)에 같이 묶었다가, "리팩터링과 실제 동작 변경을 왜 같이 묶었냐, 최소한 커밋이라도 나누라"는 사용자 피드백으로 다시 나눴다. 리팩터링(#117)은 리뷰/롤백이 기계적인 반면 이 변경은 실제 UX 회귀 가능성이 있는 변경이라, 리뷰/되돌리기 단위를 분리해야 한다는 게 이유. `ActionConfirmDialog.tsx`가 `useDismissOnOutsideClick`을 import하기 때문에 이 PR은 #117 위에 스택됨(#117이 먼저 머지돼야 함) — git 의존성이 실제로 있는 경우.

## 검증

Storybook(`apps/storybook-app`, 포트 6006)에서 실제 브라우저로 `ActionConfirmDialog` 기본 스토리 확인:
- 배경 클릭 → `onCancel` 정확히 1회 호출(Storybook Actions 패널로 확인).
- 박스 안쪽(메시지 텍스트 영역) 클릭 → `onCancel` 호출 안 됨(오탐 없음).

`packages/ui`/`apps/web`/`apps/admin` lint/typecheck/test 전부 통과.
