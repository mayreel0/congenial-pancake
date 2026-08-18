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
