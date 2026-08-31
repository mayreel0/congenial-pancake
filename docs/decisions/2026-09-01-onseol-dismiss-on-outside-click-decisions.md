# 백로그 7번("카드 컴포넌트 추출") 스코프 축소 + 바깥 클릭 dismiss 훅 추출

## 배경

원래 백로그 7번은 "카드 컴포넌트를 compound-component 패턴으로 `packages/ui`에 추출"이었다. 실제로 `/answer`(`RequestBubble`/`ReplyBubble`), `/read`(`ReadRequestBubble`/`ReadReplyBubble`), `/records`(`RequestLogCard`/`AnswerLogCard`), `/u/[slug]`(`ProfilePostCard`) 7곳을 조사한 결과, 겉보기엔 비슷한 "말풍선/카드"였지만 실제로는 더보기 메뉴 유무/항목, 저장(북마크) 토글, `highlighted` ring, 등장/퇴장 애니메이션, 작성자 표시(링크 vs 고정 라벨), 정렬(`self-start`/`justify-end`/plain `li`)이 컴포넌트마다 달라, 하나의 compound component로 묶으면 옵션 props가 잔뜩 붙은 거대 컴포넌트가 될 상황이었다. 이 프로젝트가 반복적으로 피해온 "실제로 다른 것들을 억지로 하나의 추상화로 묶기"에 해당한다고 판단해 원래 스코프는 추천하지 않음 → 사용자 확인 후 스코프를 좁힘.

## 실제로 추출한 것

1. **`useDismissOnOutsideClick`** (`packages/ui/src/useDismissOnOutsideClick.ts`) — `RequestBubble`/`ReadRequestBubble`/`ReadReplyBubble`의 "더보기" 메뉴와 `ServiceNav`의 프로필 드롭다운, 총 4곳에 거의 동일한 로직(`useState`+`useRef`+`useEffect`의 `mousedown` 리스너로 바깥 클릭 시 닫기)이 복붙돼 있던 것을 훅으로 추출. `active`/`onDismiss`만 받고 내부에서 `ref`를 만들어 반환 — 호출부는 그 ref를 "바깥 클릭 판정 기준" 요소에 걸기만 하면 됨.
2. **`MoreMenu`** (`packages/ui/src/MoreMenu.tsx`) — `RequestBubble`/`ReadRequestBubble`/`ReadReplyBubble` 3곳은 마크업(버튼/패널/항목 클래스)까지 한 글자도 다르지 않고 아이콘+라벨+onClick 목록만 달라서, 위 훅을 내부에서 쓰는 컴포넌트로 통합. `ariaLabel`(패널 aria-label)과 `items: {key, icon, label, onClick}[]`만 받음. `ServiceNav`의 프로필 드롭다운은 내용(이메일 헤더+계정 링크 목록+로그아웃)이 구조적으로 달라 이 컴포넌트엔 안 맞다고 판단, 훅만 재사용하고 마크업은 그대로 둠.

이 라운드는 순수 리팩터링(외부에서 관찰 가능한 동작 변화 없음)으로 범위를 한정했다. `ActionConfirmDialog`에 같은 훅을 적용해 배경 클릭 시 취소되도록 하는 건 실제 동작 변경이라 별도 PR(`docs/decisions/2026-09-01-onseol-action-confirm-dialog-backdrop-decisions.md`)로 분리했다 — 처음엔 한 PR/커밋에 같이 묶었다가, 리뷰/롤백 단위를 리스크별로 나눠야 한다는 사용자 피드백으로 다시 쪼갬.

## 검증

Storybook(`apps/storybook-app`, 포트 6006)에서 실제 브라우저로 `MoreMenu` 기본 스토리 확인: 클릭으로 메뉴 열림, 바깥 클릭으로 닫힘.

`packages/ui`/`apps/web`/`apps/admin`/`apps/storybook-app` lint/typecheck/test 전부 통과(web 124/124, admin 19/19).

## 하지 않은 것

- **`RequestBubble`(더보기 트리거)에서 쓰던 `MoreIcon`**은 `packages/ui`의 `MoreMenu`가 내부에 인라인으로 갖고, `apps/web/app/components/shared/icons.tsx`에서는 제거(다른 소비처 없음 확인).
- **작성자 라벨(Link vs 고정 텍스트) 패턴**도 3~4곳 비슷하게 중복이지만, `/records` 쪽만 색상 토큰(`text-muted` vs `text-foreground`)이 다르게 쓰이고 있어 스타일 통일 여부를 먼저 정해야 한다고 판단, 이번 라운드에서는 건드리지 않음 — 다음에 필요하면 별도로 논의.
- 카드 컨테이너 자체의 Tailwind 클래스 중복(rounded-lg border px-4 py-3 등)은 순수 스타일 중복이라 컴포넌트로 감쌀 실익이 없다고 보고 그대로 둠.
