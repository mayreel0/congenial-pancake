---
title: Answer Session Implementation
date: 2026-08-19
status: done
scope: /answer chat-session implementation
---

# 답하기 세션 구현 기록

## 무엇을 했는가

`docs/superpowers/plans/2026-08-19-onseol-answer-session-implementation.md`를 기준으로 `/answer` placeholder를 실제 채팅방형 답변 세션으로 교체했다.

- `PrototypeState`에 `skippedRequestIds`, `heldRequestIds`를 추가하고 localStorage 저장/복원을 확장했다 (`app/today/prototype/types.ts`, `storage-keys.ts`, `storage.ts`, `seed-data.ts`).
- `model.ts`에 `getAnswerQueue`(본인 글/이미 답한 글/스킵/보류 제외), `getHeldRequests`(FIFO), `getMyAnswerLog`(답변 완료 시각 오름차순 페어링)를 추가했다.
- `useOnseolPrototype` 훅에 `skipRequest`, `holdRequest`, `openHeldRequest`, `closeHeldRequest`와 파생 상태(`answerQueue`, `heldRequests`, `answerLog`, `currentAnswerTarget`, `isAnsweringHeldRequest`)를 추가했다. `submitReply`는 답변 완료 시 해당 id를 `heldRequestIds`에서도 제거하도록 확장했다.
- `/answer` 전용 컴포넌트(`RequestBubble`, `ReplyBubble`, `AnswerLog`, `AnswerComposer`, `HoldPanel`, `ReportConfirmDialog`)와 헬퍼(`formatTimestamp`, `buildAnonymousLabels`)를 추가했다.
- `AnswerSession`을 조립해 `app/answer/page.tsx`의 placeholder를 교체했다.

## 어떻게 검증했는가

```bash
pnpm test       # 25 files, 114 tests passed
pnpm lint        # clean
pnpm typecheck   # clean
pnpm build       # /answer 포함 9개 라우트 정적 생성 성공
```

## 판단이 필요했던 부분

- `getHeldRequests`의 타입 가드에서 `Boolean(request)`는 TypeScript 제어 흐름 분석에서 좁혀지지 않아 `request !== undefined`로 바꿨다 (`app/today/prototype/model.ts`).
- `AnswerSession.test.tsx`는 `useOnseolPrototype`의 hydration이 `setTimeout(0)` 뒤에 일어나므로, localStorage로 seed한 데이터를 검증하는 첫 assertion은 `screen.findByText`(비동기)로 기다린 뒤 이어지는 동기 assertion을 진행하도록 작성했다. `TodayPrototype.test.tsx`처럼 hydration 여부와 무관한 정적 텍스트만 검증하는 테스트라면 이 대기가 필요 없다.

## 후속 (스펙 문서의 "후속 결정 필요"에 남아있음)

- 스킵/보류 상태를 `/me`(내 기록)에서도 노출할지 여부.
- 실제 인증이 붙는 시점에 보류를 로그인 사용자 전용으로 제한할지 여부.

## 로컬 환경 메모

이 저장소는 `.nvmrc`에 Node 24.14.0을 지정하지만 로그인 셸의 기본 `node`(Homebrew, v23.3.0)로는 `pnpm`이 `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`로 즉시 죽는다. `pnpm`/`node` 명령을 실행하기 전에 `nvm use`로 프로젝트가 지정한 버전을 활성화해야 한다.

## 후속 리뷰 라운드 (2026-08-20)

최초 구현 이후 사용자 리뷰를 거쳐 같은 PR(#52)에서 아래 항목들을 추가로 반영했다. `docs/superpowers/specs/2026-08-19-onseol-answer-session-spec.md`도 최종 동작에 맞게 갱신했다.

- **폭 제한**: 로그/보류함/입력창을 nav와 동일한 `max-w-6xl`로 맞췄다.
- **요청 카드 레이아웃 재배치**: 요청자 한 줄 / 본문+조작 / 날짜·시간 한 줄 구조로.
- **신고·보류·스킵 확인 다이얼로그**: 기존에는 신고만 확인을 거쳤는데, 세 조작 모두 공용 `ActionConfirmDialog`를 거치도록 통일했다.
- **말풍선 등장/퇴장 애니메이션과 답변 pending 상태**: `/today`의 제출 lifecycle과 통일.
- **신고/보류를 `더보기`(⋯) 아이콘 메뉴로 통합, 스킵은 카드 밖 `다음 글` 버튼으로 분리**: 아이콘 두 개를 항상 노출하던 초기 버전에서, 사용자가 아이콘만으로는 신고 버튼인지 알아보기 어렵다는 피드백을 받아 라벨이 있는 메뉴로 바꿨다.
- **날짜 divider, 채팅 내 "입력 중" 버블, 답변 후에도 "다음 글 불러오는 중" 표시**: 컴포넌트 레벨 테스트(`AnswerLog.test.tsx`)로 같은 날짜끼리 divider가 중복되지 않는지 검증했다.
- **버그: 로그가 스크롤되지 않고 페이지 전체가 늘어남.** `min-h-dvh` + `flex-1`에 `min-h-0`이 빠져 있어 로그 컨테이너가 내용만큼 그냥 커졌다(`scrollHeight === clientHeight`로 실제 확인). `h-dvh` + `min-h-0` 체인으로 높이를 실제로 제한하고, `justify-end` 대신 `flex-col-reverse`(요소를 역순으로 렌더링)로 바꿔서 브라우저가 처음부터 최신 내용에 스크롤된 상태로 열리게 했다. `justify-content: flex-end`는 오버플로된 콘텐츠의 앞쪽(top)이 스크롤 불가능하게 잘리는 잘 알려진 flexbox 문제가 있어 피했다.
- **버그: "보류 중" 버튼을 눌러도 패널이 안 보임.** `HoldPanel`의 `absolute bottom-full`이 로그 전체를 감싸는 페이지 높이짜리 `relative` 컨테이너를 기준으로 계산되어, 패널이 그 컨테이너의 맨 위(화면 밖)로 렌더링되고 있었다. `relative` 기준점을 토글 버튼이 있는 작은 바 쪽으로 옮겨서 해결했다.
- 두 버그 모두 Chrome을 직접 띄워 localStorage에 여러 날짜의 테스트 데이터를 주입해 육안으로 확인한 뒤 고쳤다. 유닛 테스트만으로는 잡히지 않았던 문제였다.
