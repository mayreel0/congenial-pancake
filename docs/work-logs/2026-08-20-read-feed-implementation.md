---
title: Read Feed Implementation
date: 2026-08-20
status: done
scope: /read feed implementation
---

# 읽기 피드 구현 기록

## 무엇을 했는가

`docs/superpowers/plans/2026-08-20-onseol-read-feed-implementation.md`를 기준으로 `/read` placeholder를 실제 읽기 피드로 교체했다.

- `PrototypeState`에 `savedReplyIds`를 추가하고 localStorage 저장/복원을 확장했다 (`app/today/prototype/types.ts`, `storage-keys.ts`, `storage.ts`, `seed-data.ts`).
- `model.ts`에 `getReadFeed`를 추가했다 — 요청 + (숨김 제외) 모든 답변을 오래된 순으로 묶고, 답변이 하나도 없는 요청은 제외하며, 요청은 최신순으로 정렬한다. 본인 글도 포함한다.
- `useOnseolPrototype` 훅에 `readFeed`(메모이즈)와 `toggleSavedReply`(양방향 토글, 확인 없음)를 추가했다.
- `app/read/` 아래에 전용 컴포넌트를 새로 만들었다: `icons.tsx`(FlagIcon 복제 + BookmarkIcon 신규), `SaveToggleButton`, `ReadRequestBubble`/`ReadReplyBubble`(읽기 전용, 입력창/보류/스킵 없음), `ActionConfirmDialog`(복제), `ReadThread`(요청 1 + 답변 N 카드), `prototype/format.ts`(복제) · `prototype/labels.ts`(신규 — 요청/답변 작성자 모두 라벨링).
- `ReadFeed`를 조립해 `app/read/page.tsx`의 placeholder를 교체했다.

## 어떻게 검증했는가

```bash
pnpm test       # 13 files, 57 tests passed
pnpm lint        # clean
pnpm typecheck   # clean
pnpm build       # /read 포함 9개 라우트 정적 생성 성공
```

Chrome에 3개 요청(여러 답변 1건, 단일 답변 1건, 본인 글 1건) + 답변 없는 요청 1건을 시딩해 직접 확인:

- 요청 카드는 최신순, 답변은 오래된 순으로 정렬됨.
- 답변 없는 요청은 피드에서 제외됨.
- 본인이 쓴 요청도 정상적으로 노출됨.
- 마음에 남기기는 확인 없이 즉시 토글되고 북마크 아이콘이 채워짐.
- 답변 신고 확인 다이얼로그 → 확정 시, 그 답변이 요청의 유일한 답변이었으므로 카드 전체가 피드에서 사라짐(별도 처리 코드 없이 `getReadFeed`가 상태를 다시 계산해서 자연스럽게 사라짐).
- 콘솔에 hydration 경고/에러 없음.

`/answer` 때는 이 단계에서 실제 레이아웃 버그(스크롤 미동작, 보류함 화면 밖 렌더링)를 두 번 발견했었는데, 이번엔 `flex-col-reverse` 같은 트릭을 쓰지 않는 평범한 피드 레이아웃이라 문제가 없었다.

## 판단이 필요했던 부분

- `getReadFeed`는 `getVisibleRepliesForRequest`(최신순 정렬)의 결과를 그대로 쓰지 않고 `.reverse()`해서 오래된 순으로 뒤집었다 — 대화가 진행된 순서로 읽히게 하기 위함.
- 답변 신고 확인 문구는 "이 답변을 신고할까요? 신고하면 이 답변은 더 이상 보이지 않아요."로, 요청 신고("...읽기 목록에서 사라집니다")와 다르게 썼다 — 답변 신고가 카드 전체를 지울 수도 있다는 걸 매번 설명하지는 않되, 적어도 "무엇이 사라지는지"는 정확하게 말하도록 했다.

## 후속 (스펙 문서의 "후속 결정 필요"에 남아있음)

- `마음에 남긴 온설` 목록을 `/me`에서 어떻게 보여줄지 (이번 범위 밖).
- 피드가 길어질 경우 페이지네이션/무한 스크롤 필요 여부.

## 리뷰 라운드: 마음에 남기기를 답변 단위로 변경 (2026-08-20)

첫 구현은 카드(요청) 단위로 마음에 남기기를 뒀는데, 사용자 리뷰에서 "나중에 마음에 남긴 글을 볼 때 특정 답변이 기억나지 세션 전체가 기억나지 않는다"는 이유로 답변 단위로 바꿔달라는 요청을 받았다.

- `savedRequestIds` → `savedReplyIds`로 데이터 필드를 바꾸고, 저장 버튼을 `ReadThread`(카드 전체에 하나)에서 `ReadReplyBubble`(답변마다 하나)로 옮겼다.
- 백엔드/저장 비용 관점에서는 차이가 없다 — `(user, request)` 대신 `(user, reply)`를 참조하는 것뿐이고, `OnseolReply`에 이미 `requestId`가 있어서 나중에 `/me`에서 "저장한 답변이 있는 요청들과 그 답변들"을 보여줄 때도 추가 데이터 없이 그룹핑만 하면 된다.
- 한 요청에 답변이 여러 개일 때, 답변별로 독립적으로 저장되는지 테스트(`ReadFeed.test.tsx`)와 Chrome 실측으로 확인했다.
