# Onseol LocalStorage Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/today` localStorage prototype where a user can write a short comfort request, reply to other requests, see reply-light requests first, report/hide items, and review their own activity.

**Architecture:** The prototype lives under a new `/today` App Router route. Domain types, seed data, sorting, filtering, and localStorage persistence are split into small files under `app/today/`. React components consume a client-side hook that owns browser-only state and storage synchronization.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, localStorage, pnpm 11, Node 24.14.0 from `.nvmrc`.

## Global Constraints

- Work on a non-protected branch; do not commit directly to `main` or `v1`.
- Use `/today` for the prototype route.
- Link the landing `웹에서 시작하기` action to `/today`.
- Insert initial sample data automatically when no prototype data exists.
- Include a small reset action for prototype data, presented as a quiet secondary control.
- Start desktop with a single-flow layout; do not build a complex 2-pane desktop layout in this PR.
- In the prototype, reporting an item immediately hides it from visible lists.
- Do not implement real auth, Nest.js backend, database, server reports, AI safety filter, automatic replies, app notifications, seasonal events, or activity visualizations.
- Follow `docs/design/` rules: avoid generic SaaS hero/card patterns, keep user writing first, support light/dark mode, verify mobile 390px.
- Keep all records and work logs in Korean where they are project-facing documentation.

---

## File Structure

- Modify: `app/components/landing/EntryActions.tsx`
  - Convert `웹에서 시작하기` from inert button to `/today` link.
- Create: `app/today/page.tsx`
  - Server route entry that renders the client prototype shell.
- Create: `app/today/TodayPrototype.tsx`
  - Client component that composes sections and uses the prototype hook.
- Create: `app/today/prototype/types.ts`
  - Domain types: request, reply, viewer, drafts.
- Create: `app/today/prototype/storage-keys.ts`
  - localStorage key constants.
- Create: `app/today/prototype/seed-data.ts`
  - Initial sample requests and replies.
- Create: `app/today/prototype/model.ts`
  - Pure helpers for sorting, selecting, filtering, reporting, and deriving my activity.
- Create: `app/today/prototype/storage.ts`
  - Browser storage read/write helpers with safe fallback.
- Create: `app/today/prototype/useOnseolPrototype.ts`
  - Client hook that owns state transitions and localStorage sync.
- Create: `app/today/components/RequestComposer.tsx`
- Create: `app/today/components/ReplyComposer.tsx`
- Create: `app/today/components/NoteCard.tsx`
- Create: `app/today/components/ReplyCard.tsx`
- Create: `app/today/components/ActivitySummary.tsx`
- Create: `app/today/components/RecentExchangeList.tsx`
- Create: `app/today/components/MyActivityList.tsx`
- Create: `app/today/components/ReportButton.tsx`
- Create: `docs/work-logs/2026-08-15-localstorage-prototype-implementation.md`
  - Wiki-transfer-ready record of implementation decisions and verification.

---

### Task 1: Add Prototype Domain Model

**Files:**
- Create: `app/today/prototype/types.ts`
- Create: `app/today/prototype/storage-keys.ts`
- Create: `app/today/prototype/seed-data.ts`

**Interfaces:**
- Produces:
  - `type OnseolRequest`
  - `type OnseolReply`
  - `type OnseolViewer`
  - `type ReplyDrafts`
  - `type PrototypeState`
  - `PROTOTYPE_STORAGE_KEYS`
  - `createInitialPrototypeState(now: Date): PrototypeState`

- [ ] **Step 1: Create `types.ts`**

```ts
export type OnseolRequest = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  replyIds: string[];
  reportCount: number;
  hidden: boolean;
};

export type OnseolReply = {
  id: string;
  requestId: string;
  body: string;
  createdAt: string;
  authorId: string;
  reportCount: number;
  hidden: boolean;
};

export type OnseolViewer = {
  id: string;
};

export type ReplyDrafts = Record<string, string>;

export type PrototypeState = {
  viewer: OnseolViewer;
  requests: OnseolRequest[];
  replies: OnseolReply[];
  requestDraft: string;
  replyDrafts: ReplyDrafts;
  selectedRequestId: string | null;
};
```

- [ ] **Step 2: Create `storage-keys.ts`**

```ts
export const PROTOTYPE_STORAGE_KEYS = {
  viewer: "onseol.prototype.viewer",
  requests: "onseol.prototype.requests",
  replies: "onseol.prototype.replies",
  requestDraft: "onseol.prototype.requestDraft",
  replyDrafts: "onseol.prototype.replyDrafts",
  selectedRequestId: "onseol.prototype.selectedRequestId",
} as const;
```

- [ ] **Step 3: Create `seed-data.ts`**

Use two requests and two replies. Keep copy realistic and brief:

```ts
import type { OnseolReply, OnseolRequest, OnseolViewer, PrototypeState } from "./types";

const SAMPLE_VIEWER: OnseolViewer = { id: "viewer-local" };

export function createInitialPrototypeState(now: Date): PrototypeState {
  const today = now.toISOString();
  const requestA: OnseolRequest = {
    id: "sample-request-1",
    body: "오늘 작은 실수를 계속 떠올리게 됩니다. 너무 크게 생각하지 않아도 된다고 듣고 싶어요.",
    createdAt: today,
    authorId: "sample-author-1",
    replyIds: ["sample-reply-1"],
    reportCount: 0,
    hidden: false,
  };
  const requestB: OnseolRequest = {
    id: "sample-request-2",
    body: "해야 할 일을 끝냈는데도 이상하게 뿌듯하지 않습니다. 그래도 잘한 걸까요.",
    createdAt: today,
    authorId: "sample-author-2",
    replyIds: ["sample-reply-2"],
    reportCount: 0,
    hidden: false,
  };
  const replies: OnseolReply[] = [
    {
      id: "sample-reply-1",
      requestId: requestA.id,
      body: "계속 떠오른다는 건 신경 썼다는 뜻이기도 합니다. 오늘 하나 배웠다고 봐도 괜찮아요.",
      createdAt: today,
      authorId: "sample-replier-1",
      reportCount: 0,
      hidden: false,
    },
    {
      id: "sample-reply-2",
      requestId: requestB.id,
      body: "기분이 바로 따라오지 않아도 끝낸 일은 사라지지 않습니다. 해낸 건 해낸 거예요.",
      createdAt: today,
      authorId: "sample-replier-2",
      reportCount: 0,
      hidden: false,
    },
  ];

  return {
    viewer: SAMPLE_VIEWER,
    requests: [requestA, requestB],
    replies,
    requestDraft: "",
    replyDrafts: {},
    selectedRequestId: requestA.id,
  };
}
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

---

### Task 2: Add Pure Prototype Helpers

**Files:**
- Create: `app/today/prototype/model.ts`

**Interfaces:**
- Consumes: `OnseolRequest`, `OnseolReply`, `PrototypeState`
- Produces:
  - `isToday(isoDate: string, now: Date): boolean`
  - `getVisibleRequests(state: PrototypeState): OnseolRequest[]`
  - `getVisibleRepliesForRequest(state: PrototypeState, requestId: string): OnseolReply[]`
  - `getPriorityRequests(state: PrototypeState, now: Date): OnseolRequest[]`
  - `getRecentExchanges(state: PrototypeState): Array<{ request: OnseolRequest; reply: OnseolReply | null }>`
  - `getMyRequests(state: PrototypeState): OnseolRequest[]`
  - `getMyReplies(state: PrototypeState): OnseolReply[]`
  - `hasViewerReplied(state: PrototypeState, requestId: string): boolean`
  - `truncatePreview(text: string, maxLength: number): string`

- [ ] **Step 1: Create date and visibility helpers**

```ts
import type { OnseolReply, OnseolRequest, PrototypeState } from "./types";

export function isToday(isoDate: string, now: Date): boolean {
  const value = new Date(isoDate);
  return (
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate()
  );
}

export function getVisibleRequests(state: PrototypeState): OnseolRequest[] {
  return state.requests.filter((request) => !request.hidden);
}

export function getVisibleRepliesForRequest(
  state: PrototypeState,
  requestId: string,
): OnseolReply[] {
  return state.replies
    .filter((reply) => reply.requestId === requestId && !reply.hidden)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
```

- [ ] **Step 2: Add priority sorting**

```ts
export function getPriorityRequests(
  state: PrototypeState,
  now: Date,
): OnseolRequest[] {
  return getVisibleRequests(state).sort((a, b) => {
    const todayScore = Number(isToday(b.createdAt, now)) - Number(isToday(a.createdAt, now));
    if (todayScore !== 0) return todayScore;

    const aReplies = getVisibleRepliesForRequest(state, a.id).length;
    const bReplies = getVisibleRepliesForRequest(state, b.id).length;
    if (aReplies !== bReplies) return aReplies - bReplies;

    const noReplyScore = Number(aReplies === 0) - Number(bReplies === 0);
    if (noReplyScore !== 0) return noReplyScore;

    return b.createdAt.localeCompare(a.createdAt);
  });
}
```

- [ ] **Step 3: Add derived lists**

```ts
export function getRecentExchanges(
  state: PrototypeState,
): Array<{ request: OnseolRequest; reply: OnseolReply | null }> {
  return getVisibleRequests(state)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
    .map((request) => ({
      request,
      reply: getVisibleRepliesForRequest(state, request.id)[0] ?? null,
    }));
}

export function getMyRequests(state: PrototypeState): OnseolRequest[] {
  return getVisibleRequests(state)
    .filter((request) => request.authorId === state.viewer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMyReplies(state: PrototypeState): OnseolReply[] {
  return state.replies
    .filter((reply) => reply.authorId === state.viewer.id && !reply.hidden)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
```

- [ ] **Step 4: Add reply guard and preview helper**

```ts
export function hasViewerReplied(
  state: PrototypeState,
  requestId: string,
): boolean {
  return state.replies.some(
    (reply) =>
      reply.requestId === requestId &&
      reply.authorId === state.viewer.id &&
      !reply.hidden,
  );
}

export function truncatePreview(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
```

- [ ] **Step 5: Verify**

Run:

```bash
pnpm lint
pnpm typecheck
```

Expected: PASS.

---

### Task 3: Add Storage And State Hook

**Files:**
- Create: `app/today/prototype/storage.ts`
- Create: `app/today/prototype/useOnseolPrototype.ts`

**Interfaces:**
- Consumes: Task 1 and Task 2 helpers.
- Produces:
  - `readPrototypeState(): PrototypeState`
  - `writePrototypeState(state: PrototypeState): void`
  - `resetPrototypeState(): PrototypeState`
  - `useOnseolPrototype()` returning state, derived lists, and actions.

- [ ] **Step 1: Create storage helpers**

`storage.ts` must never run localStorage access on the server. Use a browser guard:

```ts
function canUseStorage(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}
```

Read each key with JSON parsing fallback. If no stored requests exist, return `createInitialPrototypeState(new Date())`.

- [ ] **Step 2: Add write and reset helpers**

Write all state parts to their separate localStorage keys:

```ts
localStorage.setItem(PROTOTYPE_STORAGE_KEYS.viewer, JSON.stringify(state.viewer));
localStorage.setItem(PROTOTYPE_STORAGE_KEYS.requests, JSON.stringify(state.requests));
localStorage.setItem(PROTOTYPE_STORAGE_KEYS.replies, JSON.stringify(state.replies));
localStorage.setItem(PROTOTYPE_STORAGE_KEYS.requestDraft, JSON.stringify(state.requestDraft));
localStorage.setItem(PROTOTYPE_STORAGE_KEYS.replyDrafts, JSON.stringify(state.replyDrafts));
localStorage.setItem(PROTOTYPE_STORAGE_KEYS.selectedRequestId, JSON.stringify(state.selectedRequestId));
```

`resetPrototypeState()` must create fresh seed data and write it immediately.

- [ ] **Step 3: Create `useOnseolPrototype.ts`**

Make it a client-only hook:

```ts
"use client";
```

It should expose:

```ts
type UseOnseolPrototypeResult = {
  state: PrototypeState;
  priorityRequests: OnseolRequest[];
  selectedRequest: OnseolRequest | null;
  selectedReplies: OnseolReply[];
  recentExchanges: Array<{ request: OnseolRequest; reply: OnseolReply | null }>;
  myRequests: OnseolRequest[];
  myReplies: OnseolReply[];
  updateRequestDraft(value: string): void;
  submitRequest(): void;
  selectRequest(requestId: string): void;
  updateReplyDraft(requestId: string, value: string): void;
  submitReply(requestId: string): void;
  reportRequest(requestId: string): void;
  reportReply(replyId: string): void;
  resetPrototype(): void;
  hasViewerRepliedToSelected: boolean;
};
```

- [ ] **Step 4: Implement request actions**

`submitRequest()` must:

- trim the draft
- ignore empty drafts
- create `proto-request-${Date.now()}`
- assign `authorId: state.viewer.id`
- add to requests
- set selected request to the new request
- clear `requestDraft`
- persist state

- [ ] **Step 5: Implement reply actions**

`submitReply(requestId)` must:

- trim request-specific draft
- ignore empty drafts
- block if `hasViewerReplied(state, requestId)` is true
- create `proto-reply-${Date.now()}`
- add reply to `replies`
- add reply id to the target request's `replyIds`
- clear that request's reply draft
- persist state

- [ ] **Step 6: Implement reporting actions**

`reportRequest(requestId)` and `reportReply(replyId)` must increment `reportCount` and set `hidden: true`.

If the selected request becomes hidden, select the first visible priority request or `null`.

- [ ] **Step 7: Verify**

Run:

```bash
pnpm lint
pnpm typecheck
```

Expected: PASS.

---

### Task 4: Build Prototype UI Components

**Files:**
- Create all files in `app/today/components/`.

**Interfaces:**
- Consumes `OnseolRequest`, `OnseolReply`, and hook actions.
- Produces reusable component candidates for later Storybook extraction.

- [ ] **Step 1: Create `ReportButton.tsx`**

Props:

```ts
type ReportButtonProps = {
  label: string;
  onReport(): void;
};
```

Render a quiet text button. Visible text should be `신고`.

- [ ] **Step 2: Create `RequestComposer.tsx`**

Props:

```ts
type RequestComposerProps = {
  value: string;
  onChange(value: string): void;
  onSubmit(): void;
};
```

Render:

- label: `오늘 남기기`
- textarea placeholder: `힘들었던 일이나 칭찬받고 싶은 일을 짧게 남겨보세요.`
- helper text: `작성 중인 내용은 이 브라우저에 임시 저장됩니다.`
- submit button: `남기기`

- [ ] **Step 3: Create `NoteCard.tsx`**

Props:

```ts
type NoteCardProps = {
  request: OnseolRequest;
  replyCount: number;
  selected: boolean;
  mine: boolean;
  onSelect(): void;
  onReport(): void;
};
```

Render request body first. Secondary text may include `답장 {replyCount}개` and `내가 남긴 글`.

- [ ] **Step 4: Create `ReplyCard.tsx`**

Props:

```ts
type ReplyCardProps = {
  reply: OnseolReply;
  mine: boolean;
  onReport(): void;
};
```

Render reply body first. Secondary text may include `내 답장`.

- [ ] **Step 5: Create `ReplyComposer.tsx`**

Props:

```ts
type ReplyComposerProps = {
  value: string;
  disabled: boolean;
  onChange(value: string): void;
  onSubmit(): void;
};
```

When disabled, show `이미 이 글에 답장을 남겼습니다.` and disable submit.

- [ ] **Step 6: Create `ActivitySummary.tsx`**

Props:

```ts
type ActivitySummaryProps = {
  requestCount: number;
  replyCount: number;
  waitingCount: number;
};
```

Prefer a sentence-style display over three large KPI cards:

`오늘 {requestCount}개의 이야기가 남겨졌고, {replyCount}개의 답장이 도착했습니다. 아직 {waitingCount}개의 글이 답장을 기다립니다.`

- [ ] **Step 7: Create `RecentExchangeList.tsx` and `MyActivityList.tsx`**

Use previews with `truncatePreview(text, 80)`.

`MyActivityList` should have two sections:

- `내가 남긴 글`
- `내가 남긴 답장`

- [ ] **Step 8: Verify**

Run:

```bash
pnpm lint
pnpm typecheck
```

Expected: PASS.

---

### Task 5: Compose `/today` Route

**Files:**
- Create: `app/today/page.tsx`
- Create: `app/today/TodayPrototype.tsx`

**Interfaces:**
- Consumes all hook and UI components.
- Produces usable `/today` prototype.

- [ ] **Step 1: Create `page.tsx`**

```tsx
import { TodayPrototype } from "./TodayPrototype";

export default function TodayPage() {
  return <TodayPrototype />;
}
```

- [ ] **Step 2: Create `TodayPrototype.tsx`**

Make it a client component. Compose in this order:

1. page header with `오늘의 온설`
2. `RequestComposer`
3. `ActivitySummary`
4. priority request list
5. selected request detail with replies and `ReplyComposer`
6. `RecentExchangeList`
7. `MyActivityList`
8. quiet reset button

- [ ] **Step 3: Apply responsive layout**

Use a single-flow layout for all widths in this PR.

Use max width no larger than `max-w-5xl`, with `px-5`, `py-6` on mobile and slightly larger spacing on desktop.

Do not add a 2-pane desktop layout in this PR.

- [ ] **Step 4: Handle empty states**

If no visible requests exist, show:

`지금은 보이는 글이 없습니다. 오늘 있었던 일을 짧게 남겨보세요.`

If selected request is null, do not show reply composer.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Expected: PASS.

---

### Task 6: Link Landing To Prototype

**Files:**
- Modify: `app/components/landing/EntryActions.tsx`

**Interfaces:**
- Consumes `/today` route from Task 5.
- Produces landing CTA that opens the prototype.

- [ ] **Step 1: Import `Link`**

```tsx
import Link from "next/link";
```

- [ ] **Step 2: Replace primary button with link**

Use:

```tsx
<Link
  className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 whitespace-nowrap"
  href="/today"
>
  웹에서 시작하기
</Link>
```

Keep `앱으로 이용하기 · 준비 중` disabled.

- [ ] **Step 3: Verify**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Expected: PASS.

---

### Task 7: Browser Verification

**Files:**
- No required file changes unless verification finds issues.

**Interfaces:**
- Consumes completed app.
- Produces verification evidence for PR.

- [ ] **Step 1: Start dev server**

Run:

```bash
pnpm dev --hostname 127.0.0.1 --port 3000
```

Expected: server starts.

- [ ] **Step 2: Verify landing link**

Open `/` and click `웹에서 시작하기`.

Expected: browser navigates to `/today`.

- [ ] **Step 3: Verify request draft persistence**

1. Type a request.
2. Reload.
3. Confirm textarea keeps the draft.
4. Submit.
5. Confirm request appears and draft clears.

- [ ] **Step 4: Verify reply flow**

1. Select a sample request.
2. Type a reply.
3. Reload.
4. Confirm reply draft persists.
5. Submit.
6. Confirm reply appears.
7. Confirm second reply to same request is disabled.

- [ ] **Step 5: Verify reporting**

1. Report a request.
2. Confirm it disappears from priority and recent lists.
3. Report a reply.
4. Confirm it disappears from the selected request replies.

- [ ] **Step 6: Verify responsive and theme**

Check:

- 390px x 844px
- 768px x 1024px
- 1024px x 768px
- 1440px x 900px

For each, confirm no horizontal scroll, no button text wrap, readable long Korean text, and readable dark mode.

- [ ] **Step 7: Stop dev server**

Stop with `Ctrl-C`.

Expected: no required dev server remains running.

---

### Task 8: Documentation And PR

**Files:**
- Create: `docs/work-logs/2026-08-15-localstorage-prototype-implementation.md`

**Interfaces:**
- Consumes implementation and verification evidence.
- Produces wiki-transfer-ready notes.

- [ ] **Step 1: Write Korean work log**

Include:

- route decision `/today`
- landing link decision
- localStorage keys used
- sample data behavior
- reset behavior
- reporting/hiding behavior
- responsive verification results
- Storybook component candidates found
- implementation mistakes or lessons

- [ ] **Step 2: Final verification**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Expected: PASS.

- [ ] **Step 3: Review final status**

Run:

```bash
git status --short
git diff --stat
```

Expected: only prototype implementation and work log files changed.

- [ ] **Step 4: Commit**

Use a feature commit:

```bash
git add app/components/landing/EntryActions.tsx app/today docs/work-logs/2026-08-15-localstorage-prototype-implementation.md
git commit -m "feat: add localstorage prototype"
```

- [ ] **Step 5: Open PR**

Push branch and open a PR targeting `v1`.

PR body must mention:

- `/today` route
- localStorage-only prototype
- landing CTA link
- excluded backend/auth/AI/app notification scope
- verification commands and browser checks

---

## Self-Review Notes

- Spec coverage: request draft, reply draft, priority requests, recent exchanges, report/hide, my activity, responsive checks, web/app consistency, and Storybook handoff are covered.
- Deferred full-stack scope remains excluded: auth, backend, database, real moderation, AI safety filter, and notifications are not implemented.
- Implementation default decisions are explicit: `/today`, landing link, sample auto seed, quiet reset action, single-flow desktop layout, report-immediate-hide.
- Type consistency: `OnseolRequest`, `OnseolReply`, `OnseolViewer`, `ReplyDrafts`, and `PrototypeState` are defined before later tasks reference them.
