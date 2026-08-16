---
title: 프로토타입에서 표시 상태와 행동 이력을 분리하기
date: 2026-08-17
category: logic-errors
module: Onseol localStorage prototype
problem_type: logic_error
component: development_workflow
symptoms:
  - "신고로 숨긴 내 답변 뒤에 같은 요청에 다시 답변할 수 있었다."
  - "빠른 중복 제출이 stale render state를 통과하면 같은 요청에 여러 답변이 생길 수 있었다."
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags: [localstorage, react-state, prototype, review-feedback]
---

# 프로토타입에서 표시 상태와 행동 이력을 분리하기

## Problem

온설 localStorage 프로토타입은 `한 사람은 한 위로 요청에 답변 1개`라는 제품 규칙을 화면에 보이는 답변 기준으로 판단하고 있었다. 그 결과 답변을 신고해 숨긴 뒤에는 사용자가 이미 답변했다는 이력이 사라진 것처럼 처리될 수 있었다.

## Symptoms

- 사용자가 답변을 남긴 뒤 자신의 답변을 신고하면 답변이 숨겨진다.
- 숨김 답변을 `hasViewerReplied`에서 제외하면 같은 요청의 답변 작성 UI가 다시 열릴 수 있다.
- 답변 제출 함수가 render closure의 `state`로 먼저 검사하면 빠른 중복 제출이 최신 상태를 보지 못할 수 있다.

## What Didn't Work

- `getVisibleRepliesForRequest`처럼 화면 표시용 helper의 기준을 행동 제약에도 그대로 쓰는 방식은 맞지 않았다. 표시 목록은 `hidden`을 제외해야 하지만, 답변 작성 가능 여부는 숨김 여부와 무관하게 사용자의 작성 이력을 봐야 한다.
- 답변 제출 전에 함수 바깥의 `state`로만 `hasViewerReplied`를 확인하는 방식은 React 상태 업데이트 타이밍에서 stale state 문제가 생길 수 있다.

## Solution

표시 상태와 행동 이력을 분리했다. 화면에 보이는 답변 목록은 계속 `hidden`을 제외하지만, 이미 답변했는지 확인하는 `hasViewerReplied`는 숨김 여부와 무관하게 같은 작성자의 답변 이력을 찾는다. 현재 구현은 [model.ts](../../../app/today/prototype/model.ts) 68라인 근처에서 이 기준을 정의한다.

```ts
export function hasViewerReplied(
  state: PrototypeState,
  requestId: string,
): boolean {
  return state.replies.some(
    (reply) =>
      reply.requestId === requestId && reply.authorId === state.viewer.id,
  );
}
```

또한 답변 제출 가드와 draft 읽기를 React functional update 내부로 옮겼다. 현재 구현은 [useOnseolPrototype.ts](../../../app/today/prototype/useOnseolPrototype.ts) 134라인 근처에서 최신 `current` 상태를 기준으로 `body`와 `hasViewerReplied`를 확인한다.

```ts
function submitReply(requestId: string): void {
  updateState((current) => {
    const body = (current.replyDrafts[requestId] ?? "").trim();
    if (!body || hasViewerReplied(current, requestId)) return current;

    // append reply from current state
  });
}
```

## Why This Works

`hidden`은 신고/필터 결과에 따른 표시 상태이고, `authorId + requestId`는 사용자의 행동 이력이다. 두 상태를 같은 helper로 판단하면 신고된 답변이 목록에서는 사라져야 하는 요구와, 이미 답변한 사용자가 다시 답변하면 안 된다는 요구가 충돌한다.

functional update 내부에서 검사하면 연속 클릭이나 빠른 이벤트에서도 두 번째 업데이트가 첫 번째 업데이트 결과를 포함한 `current`를 받는다. 따라서 중복 제출은 동일한 `hasViewerReplied(current, requestId)` 조건에서 차단된다.

## Prevention

- UI 표시용 selector와 제품 제약용 guard를 같은 의미로 재사용하지 않는다.
- `hidden`, `deleted`, `moderated`처럼 visibility를 바꾸는 필드는 ownership, uniqueness, quota 같은 행동 제약과 분리해 모델링한다.
- React 상태 전환에서 중복 제출, quota, uniqueness를 막는 검사는 가능한 한 `setState(current => next)` 내부 최신 상태로 수행한다.
- 리뷰 후에는 “숨김 후 재시도”, “빠른 중복 클릭”, “빈 목록 전환” 같은 경계 흐름을 브라우저 회귀 확인에 포함한다.

## Related Issues

- [localStorage 프로토타입 구현 기록](../../work-logs/2026-08-15-localstorage-prototype-implementation.md)
