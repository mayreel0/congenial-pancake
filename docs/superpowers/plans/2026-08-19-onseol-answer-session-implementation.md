# Onseol Answer Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the `/answer` placeholder with a chat-room style answer session: a scrollable request/reply log, a bottom-fixed composer, skip/hold/report actions on the live request, and a hold panel for parking requests to answer later.

**Spec:** `docs/superpowers/specs/2026-08-19-onseol-answer-session-spec.md`. Follow it for all product behavior. This plan only covers implementation sequencing.

**Architecture:**
- Extend the existing single `PrototypeState`/`useOnseolPrototype` hook (already the shared store behind `/today`) with skip/hold bookkeeping and answer-queue derivations, instead of creating a second independent state store. `/today` and `/answer` read/write the same localStorage-backed state, just at different times (Next.js unmounts one route before mounting the other, so there is no dual-instance write conflict).
- Keep the shared prototype module at `app/today/prototype/*` for now and import it from `/answer`. It already owns the request/reply data; moving it to a new shared folder is a bigger, higher-risk rename that only pays off once a third route (`/read` or `/me`) also needs it. Do that relocation later if it comes up, not in this plan.
- Reuse existing components where the spec matches (`ReportButton`, `truncatePreview`); add new `/answer`-specific components for the chat bubbles, composer, hold panel, and report confirmation dialog since their layout differs from `/today`'s.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Vitest, React Testing Library, jsdom, pnpm.

## Global Constraints

- Base branch is `v1`; do not push directly to `main` or `v1`.
- Request bubbles on the left, my reply bubbles on the right, bottom-fixed composer, append-only scroll history (oldest at top, newest at bottom).
- Reporting a request also removes it from the queue permanently (reuse the existing `hidden` flag; no separate bookkeeping needed).
- Skipping a request removes it from the viewer's queue permanently (not session-scoped).
- Holding a request removes it from the live queue and adds it to a hold list (FIFO order, oldest hold first), with no cap and no auto-expiry.
- Reporting requires a confirmation dialog before it takes effect (different from `/today`'s instant report — do not change `/today`'s existing behavior).
- Answering a held request appends the completed request/reply pair to the log ordered by **reply completion time**, not original request time.
- The viewer's own requests never appear in the answer queue or hold list.
- Preserve dark-mode token usage through existing CSS variables (`bg-surface`, `border-line`, `text-muted`, `text-foreground`, `bg-primary`, etc.).
- Keep copy 담백; the answer guidance text must not read like an AI auto-write feature.

---

## File Structure

- Modify `app/today/prototype/types.ts` — add `skippedRequestIds` and `heldRequestIds` to `PrototypeState`.
- Modify `app/today/prototype/storage-keys.ts` — add two new storage keys.
- Modify `app/today/prototype/storage.ts` — read/write the two new arrays with `[]` fallback.
- Modify `app/today/prototype/seed-data.ts` — initialize the two new arrays.
- Modify `app/today/prototype/model.ts` — add `getAnswerQueue`, `getHeldRequests`, `getMyAnswerLog`.
- Modify `app/today/prototype/model.test.ts` — fix existing fixtures (new required fields) and add tests for the new functions.
- Modify `app/today/prototype/useOnseolPrototype.ts` — add `skipRequest`, `holdRequest`, `openHeldRequest`, `closeHeldRequest`, and derived `answerQueue`, `heldRequests`, `answerLog`, `currentAnswerTarget`, `isAnsweringHeldRequest`; extend `submitReply` to clear hold bookkeeping.
- Modify `app/today/prototype/useOnseolPrototype.test.tsx` — add tests for skip/hold/answer-target behavior.
- Create `app/answer/prototype/format.ts` — `formatTimestamp`.
- Create `app/answer/prototype/labels.ts` — `buildAnonymousLabels`.
- Create `app/answer/components/RequestBubble.tsx`
- Create `app/answer/components/ReplyBubble.tsx`
- Create `app/answer/components/AnswerLog.tsx`
- Create `app/answer/components/AnswerComposer.tsx`
- Create `app/answer/components/HoldPanel.tsx`
- Create `app/answer/components/ReportConfirmDialog.tsx`
- Create `app/answer/AnswerSession.tsx`
- Create `app/answer/AnswerSession.test.tsx`
- Modify `app/answer/page.tsx` — render `AnswerSession` instead of the placeholder copy.
- Modify a work log under `docs/work-logs/` — record verification.

---

### Task 1: Extend Prototype State For Skip/Hold

**Files:**
- Modify: `app/today/prototype/types.ts`
- Modify: `app/today/prototype/storage-keys.ts`
- Modify: `app/today/prototype/storage.ts`
- Modify: `app/today/prototype/seed-data.ts`
- Modify: `app/today/prototype/model.test.ts`

**Interfaces:**
- Produces: `PrototypeState.skippedRequestIds: string[]`, `PrototypeState.heldRequestIds: string[]`.

- [x] **Step 1: Add the new fields to `PrototypeState`**

In `app/today/prototype/types.ts`, add to `PrototypeState`:

```ts
export type PrototypeState = {
  viewer: OnseolViewer;
  requests: OnseolRequest[];
  replies: OnseolReply[];
  requestDraft: string;
  replyDrafts: ReplyDrafts;
  selectedRequestId: string | null;
  skippedRequestIds: string[];
  heldRequestIds: string[];
};
```

- [x] **Step 2: Add storage keys**

In `app/today/prototype/storage-keys.ts`:

```ts
export const PROTOTYPE_STORAGE_KEYS = {
  viewer: "onseol.prototype.viewer",
  requests: "onseol.prototype.requests",
  replies: "onseol.prototype.replies",
  requestDraft: "onseol.prototype.requestDraft",
  replyDrafts: "onseol.prototype.replyDrafts",
  selectedRequestId: "onseol.prototype.selectedRequestId",
  skippedRequestIds: "onseol.prototype.skippedRequestIds",
  heldRequestIds: "onseol.prototype.heldRequestIds",
} as const;
```

- [x] **Step 3: Read/write the new fields**

In `app/today/prototype/storage.ts`, update `readPrototypeState` to read the two new keys with `[]` fallback, and `writePrototypeState` to persist them:

```ts
export function readPrototypeState(): PrototypeState {
  const fallback = createInitialPrototypeState(new Date());
  const requests = readJson<OnseolRequest[]>(PROTOTYPE_STORAGE_KEYS.requests);

  if (!requests || requests.length === 0) {
    writePrototypeState(fallback);
    return fallback;
  }

  const viewer = readJson<OnseolViewer>(PROTOTYPE_STORAGE_KEYS.viewer);
  const replies = readJson<OnseolReply[]>(PROTOTYPE_STORAGE_KEYS.replies);
  const requestDraft = readJson<string>(PROTOTYPE_STORAGE_KEYS.requestDraft);
  const replyDrafts = readJson<ReplyDrafts>(
    PROTOTYPE_STORAGE_KEYS.replyDrafts,
  );
  const selectedRequestId = readJson<string | null>(
    PROTOTYPE_STORAGE_KEYS.selectedRequestId,
  );
  const skippedRequestIds = readJson<string[]>(
    PROTOTYPE_STORAGE_KEYS.skippedRequestIds,
  );
  const heldRequestIds = readJson<string[]>(
    PROTOTYPE_STORAGE_KEYS.heldRequestIds,
  );

  return {
    viewer: viewer ?? fallback.viewer,
    requests,
    replies: replies ?? [],
    requestDraft: requestDraft ?? "",
    replyDrafts: replyDrafts ?? {},
    selectedRequestId: selectedRequestId ?? requests[0]?.id ?? null,
    skippedRequestIds: skippedRequestIds ?? [],
    heldRequestIds: heldRequestIds ?? [],
  };
}

export function writePrototypeState(state: PrototypeState): void {
  writeJson(PROTOTYPE_STORAGE_KEYS.viewer, state.viewer);
  writeJson(PROTOTYPE_STORAGE_KEYS.requests, state.requests);
  writeJson(PROTOTYPE_STORAGE_KEYS.replies, state.replies);
  writeJson(PROTOTYPE_STORAGE_KEYS.requestDraft, state.requestDraft);
  writeJson(PROTOTYPE_STORAGE_KEYS.replyDrafts, state.replyDrafts);
  writeJson(PROTOTYPE_STORAGE_KEYS.selectedRequestId, state.selectedRequestId);
  writeJson(PROTOTYPE_STORAGE_KEYS.skippedRequestIds, state.skippedRequestIds);
  writeJson(PROTOTYPE_STORAGE_KEYS.heldRequestIds, state.heldRequestIds);
}
```

This keeps existing localStorage data from before this change readable (missing keys just fall back to `[]`).

- [x] **Step 4: Initialize the fields in seed data**

In `app/today/prototype/seed-data.ts`, add to the returned object:

```ts
return {
  viewer: SAMPLE_VIEWER,
  requests: [requestA, requestB],
  replies,
  requestDraft: "",
  replyDrafts: {},
  selectedRequestId: requestA.id,
  skippedRequestIds: [],
  heldRequestIds: [],
};
```

- [x] **Step 5: Fix existing fixtures**

`app/today/prototype/model.test.ts` builds `PrototypeState` object literals by hand. Add `skippedRequestIds: []` and `heldRequestIds: []` to every fixture in that file so it still type-checks.

- [x] **Step 6: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS (no other file constructs a full `PrototypeState` literal besides `model.test.ts` and `seed-data.ts`).

- [x] **Step 7: Commit**

```bash
git add app/today/prototype/types.ts app/today/prototype/storage-keys.ts app/today/prototype/storage.ts app/today/prototype/seed-data.ts app/today/prototype/model.test.ts
git commit -m "feat: add skip and hold state to the onseol prototype store"
```

---

### Task 2: Answer Queue, Hold List, And Answer Log Selectors

**Files:**
- Modify: `app/today/prototype/model.ts`
- Modify: `app/today/prototype/model.test.ts`

**Interfaces:**
- Produces: `getAnswerQueue(state, now)`, `getHeldRequests(state)`, `getMyAnswerLog(state)`.

- [x] **Step 1: Write failing tests**

Add to `app/today/prototype/model.test.ts`:

```ts
import {
  getAnswerQueue,
  getHeldRequests,
  getMyAnswerLog,
  getPriorityRequests,
  getRecentNonViewerRequests,
  getTodayEntryMessages,
} from "./model";

describe("getAnswerQueue", () => {
  const state: PrototypeState = {
    viewer: { id: "viewer-local" },
    requests: [
      {
        id: "mine",
        body: "내가 쓴 글",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "viewer-local",
        replyIds: [],
        reportCount: 0,
        hidden: false,
      },
      {
        id: "already-answered",
        body: "이미 답한 글",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "author-1",
        replyIds: ["reply-mine"],
        reportCount: 0,
        hidden: false,
      },
      {
        id: "skipped",
        body: "스킵한 글",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "author-2",
        replyIds: [],
        reportCount: 0,
        hidden: false,
      },
      {
        id: "held",
        body: "보류한 글",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "author-3",
        replyIds: [],
        reportCount: 0,
        hidden: false,
      },
      {
        id: "answerable",
        body: "답할 수 있는 글",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "author-4",
        replyIds: [],
        reportCount: 0,
        hidden: false,
      },
    ],
    replies: [
      {
        id: "reply-mine",
        requestId: "already-answered",
        body: "내가 이미 남긴 답변",
        createdAt: "2026-08-19T09:30:00.000Z",
        authorId: "viewer-local",
        reportCount: 0,
        hidden: false,
      },
    ],
    requestDraft: "",
    replyDrafts: {},
    selectedRequestId: null,
    skippedRequestIds: ["skipped"],
    heldRequestIds: ["held"],
  };

  it("excludes own requests, already-answered requests, skipped requests, and held requests", () => {
    const queue = getAnswerQueue(state, new Date("2026-08-19T12:00:00.000Z"));

    expect(queue.map((request) => request.id)).toEqual(["answerable"]);
  });
});

describe("getHeldRequests", () => {
  it("returns held requests in the order they were held, skipping hidden ones", () => {
    const state: PrototypeState = {
      viewer: { id: "viewer-local" },
      requests: [
        {
          id: "held-first",
          body: "먼저 보류한 글",
          createdAt: "2026-08-19T09:00:00.000Z",
          authorId: "author-1",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "held-second",
          body: "나중에 보류한 글",
          createdAt: "2026-08-19T09:00:00.000Z",
          authorId: "author-2",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "held-hidden",
          body: "신고돼서 숨겨진 글",
          createdAt: "2026-08-19T09:00:00.000Z",
          authorId: "author-3",
          replyIds: [],
          reportCount: 1,
          hidden: true,
        },
      ],
      replies: [],
      requestDraft: "",
      replyDrafts: {},
      selectedRequestId: null,
      skippedRequestIds: [],
      heldRequestIds: ["held-first", "held-second", "held-hidden"],
    };

    expect(getHeldRequests(state).map((request) => request.id)).toEqual([
      "held-first",
      "held-second",
    ]);
  });
});

describe("getMyAnswerLog", () => {
  it("pairs my replies with their requests, oldest reply first", () => {
    const state: PrototypeState = {
      viewer: { id: "viewer-local" },
      requests: [
        {
          id: "request-a",
          body: "요청 A",
          createdAt: "2026-08-15T09:00:00.000Z",
          authorId: "author-1",
          replyIds: ["reply-a"],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "request-b",
          body: "요청 B",
          createdAt: "2026-08-10T09:00:00.000Z",
          authorId: "author-2",
          replyIds: ["reply-b"],
          reportCount: 0,
          hidden: false,
        },
      ],
      replies: [
        {
          id: "reply-a",
          requestId: "request-a",
          body: "최근에 답한 것",
          createdAt: "2026-08-19T10:00:00.000Z",
          authorId: "viewer-local",
          reportCount: 0,
          hidden: false,
        },
        {
          id: "reply-b",
          requestId: "request-b",
          body: "보류했다가 방금 답한 것",
          createdAt: "2026-08-19T11:00:00.000Z",
          authorId: "viewer-local",
          reportCount: 0,
          hidden: false,
        },
      ],
      requestDraft: "",
      replyDrafts: {},
      selectedRequestId: null,
      skippedRequestIds: [],
      heldRequestIds: [],
    };

    const log = getMyAnswerLog(state);

    expect(log.map((entry) => entry.request.id)).toEqual([
      "request-a",
      "request-b",
    ]);
  });
});
```

- [x] **Step 2: Run tests to verify RED**

Run: `pnpm test app/today/prototype/model.test.ts`

Expected: FAIL because `getAnswerQueue`, `getHeldRequests`, `getMyAnswerLog` do not exist.

- [x] **Step 3: Implement the selectors**

Add to `app/today/prototype/model.ts`:

```ts
export function getAnswerQueue(
  state: PrototypeState,
  now: Date,
): OnseolRequest[] {
  return getPriorityRequests(state, now).filter(
    (request) =>
      request.authorId !== state.viewer.id &&
      !hasViewerReplied(state, request.id) &&
      !state.skippedRequestIds.includes(request.id) &&
      !state.heldRequestIds.includes(request.id),
  );
}

export function getHeldRequests(state: PrototypeState): OnseolRequest[] {
  return state.heldRequestIds
    .map((id) => state.requests.find((request) => request.id === id))
    .filter(
      (request): request is OnseolRequest =>
        Boolean(request) && !request.hidden,
    );
}

export function getMyAnswerLog(
  state: PrototypeState,
): Array<{ request: OnseolRequest; reply: OnseolReply }> {
  return state.replies
    .filter((reply) => reply.authorId === state.viewer.id && !reply.hidden)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((reply) => {
      const request = state.requests.find((r) => r.id === reply.requestId);
      return request ? { request, reply } : null;
    })
    .filter(
      (entry): entry is { request: OnseolRequest; reply: OnseolReply } =>
        entry !== null,
    );
}
```

- [x] **Step 4: Run tests to verify GREEN**

Run: `pnpm test app/today/prototype/model.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add app/today/prototype/model.ts app/today/prototype/model.test.ts
git commit -m "feat: add answer queue, hold list, and answer log selectors"
```

---

### Task 3: Hook Actions For Skip, Hold, And Answer Target

**Files:**
- Modify: `app/today/prototype/useOnseolPrototype.ts`
- Modify: `app/today/prototype/useOnseolPrototype.test.tsx`

**Interfaces:**
- Produces: `skipRequest(requestId)`, `holdRequest(requestId)`, `openHeldRequest(requestId)`, `closeHeldRequest()`, `answerQueue`, `heldRequests`, `answerLog`, `currentAnswerTarget`, `isAnsweringHeldRequest`.
- Consumes: `getAnswerQueue`, `getHeldRequests`, `getMyAnswerLog` from `./model`.

- [x] **Step 1: Write failing tests**

Add to `app/today/prototype/useOnseolPrototype.test.tsx` a second harness and describe block:

```tsx
function AnswerHarness() {
  const prototype = useOnseolPrototype();
  const target = prototype.currentAnswerTarget;

  return (
    <div>
      <p data-testid="target-body">{target?.body ?? "없음"}</p>
      <p data-testid="held-count">{prototype.heldRequests.length}</p>
      <p data-testid="log-count">{prototype.answerLog.length}</p>
      <p data-testid="answering-held">
        {prototype.isAnsweringHeldRequest ? "yes" : "no"}
      </p>
      {target ? (
        <>
          <button onClick={() => prototype.skipRequest(target.id)}>
            skip
          </button>
          <button onClick={() => prototype.holdRequest(target.id)}>
            hold
          </button>
          <textarea
            aria-label="answer"
            value={prototype.state.replyDrafts[target.id] ?? ""}
            onChange={(event) =>
              prototype.updateReplyDraft(target.id, event.target.value)
            }
          />
          <button onClick={() => prototype.submitReply(target.id)}>
            submit
          </button>
        </>
      ) : null}
      {prototype.heldRequests.map((request) => (
        <button
          key={request.id}
          onClick={() => prototype.openHeldRequest(request.id)}
        >
          open {request.body}
        </button>
      ))}
    </div>
  );
}

describe("useOnseolPrototype answer session", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("moves the queue forward when the current target is skipped", () => {
    render(<AnswerHarness />);

    const firstTarget = screen.getByTestId("target-body").textContent;
    fireEvent.click(screen.getByRole("button", { name: "skip" }));

    expect(screen.getByTestId("target-body").textContent).not.toEqual(
      firstTarget,
    );
  });

  it("moves a held target out of the live queue and into the hold list", () => {
    render(<AnswerHarness />);

    fireEvent.click(screen.getByRole("button", { name: "hold" }));

    expect(screen.getByTestId("held-count")).toHaveTextContent("1");
  });

  it("answers a held request, removes it from the hold list, and adds it to the log", () => {
    render(<AnswerHarness />);

    fireEvent.click(screen.getByRole("button", { name: "hold" }));
    const openButton = screen.getAllByRole("button", { name: /^open / })[0];
    fireEvent.click(openButton);

    expect(screen.getByTestId("answering-held")).toHaveTextContent("yes");

    fireEvent.change(screen.getByLabelText("answer"), {
      target: { value: "짧은 답변입니다." },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(screen.getByTestId("held-count")).toHaveTextContent("0");
    expect(screen.getByTestId("log-count")).toHaveTextContent("1");
    expect(screen.getByTestId("answering-held")).toHaveTextContent("no");
  });
});
```

- [x] **Step 2: Run tests to verify RED**

Run: `pnpm test app/today/prototype/useOnseolPrototype.test.tsx`

Expected: FAIL because the new hook fields/actions do not exist.

- [x] **Step 3: Implement the hook additions**

In `app/today/prototype/useOnseolPrototype.ts`:

Add imports:

```ts
import {
  getAnswerQueue,
  getHeldRequests,
  getMyAnswerLog,
  getMyReplies,
  getMyRequests,
  getPriorityRequests,
  getRecentExchanges,
  getTodayEntryMessages,
  getVisibleRepliesForRequest,
  hasViewerReplied,
} from "./model";
```

Add to `UseOnseolPrototypeResult`:

```ts
answerQueue: OnseolRequest[];
heldRequests: OnseolRequest[];
answerLog: Array<{ request: OnseolRequest; reply: OnseolReply }>;
currentAnswerTarget: OnseolRequest | null;
isAnsweringHeldRequest: boolean;
skipRequest(requestId: string): void;
holdRequest(requestId: string): void;
openHeldRequest(requestId: string): void;
closeHeldRequest(): void;
```

Inside the hook body, add state and derivations:

```ts
const [activeHeldRequestId, setActiveHeldRequestId] = useState<string | null>(
  null,
);

const answerQueue = useMemo(() => getAnswerQueue(state, now), [now, state]);
const heldRequests = useMemo(() => getHeldRequests(state), [state]);
const answerLog = useMemo(() => getMyAnswerLog(state), [state]);
const activeHeldRequest = activeHeldRequestId
  ? (state.requests.find(
      (request) =>
        request.id === activeHeldRequestId &&
        !request.hidden &&
        state.heldRequestIds.includes(request.id),
    ) ?? null)
  : null;
const currentAnswerTarget = activeHeldRequest ?? answerQueue[0] ?? null;
```

Add the new actions (near `submitReply`):

```ts
function skipRequest(requestId: string): void {
  updateState((current) => {
    if (current.skippedRequestIds.includes(requestId)) return current;

    return {
      ...current,
      skippedRequestIds: [...current.skippedRequestIds, requestId],
      heldRequestIds: current.heldRequestIds.filter((id) => id !== requestId),
    };
  });

  if (activeHeldRequestId === requestId) setActiveHeldRequestId(null);
}

function holdRequest(requestId: string): void {
  updateState((current) => {
    if (current.heldRequestIds.includes(requestId)) return current;

    return {
      ...current,
      heldRequestIds: [...current.heldRequestIds, requestId],
    };
  });
}

function openHeldRequest(requestId: string): void {
  if (!state.heldRequestIds.includes(requestId)) return;
  setActiveHeldRequestId(requestId);
}

function closeHeldRequest(): void {
  setActiveHeldRequestId(null);
}
```

Extend `submitReply` to also drop the answered id from `heldRequestIds`, and reset `activeHeldRequestId` when it was the target:

```ts
function submitReply(requestId: string): void {
  updateState((current) => {
    const body = (current.replyDrafts[requestId] ?? "").trim();
    if (!body || hasViewerReplied(current, requestId)) return current;

    const reply: OnseolReply = {
      id: createReplyId(),
      requestId,
      body,
      createdAt: new Date().toISOString(),
      authorId: current.viewer.id,
      reportCount: 0,
      hidden: false,
    };

    return {
      ...current,
      replies: [reply, ...current.replies],
      requests: current.requests.map((request) =>
        request.id === requestId
          ? { ...request, replyIds: [...request.replyIds, reply.id] }
          : request,
      ),
      replyDrafts: {
        ...current.replyDrafts,
        [requestId]: "",
      },
      heldRequestIds: current.heldRequestIds.filter((id) => id !== requestId),
    };
  });

  if (activeHeldRequestId === requestId) setActiveHeldRequestId(null);
}
```

Add the new fields to the returned object:

```ts
return {
  state,
  requestSubmitStatus,
  todayEntryMessages,
  priorityRequests,
  selectedRequest,
  selectedReplies,
  recentExchanges,
  myRequests,
  myReplies,
  answerQueue,
  heldRequests,
  answerLog,
  currentAnswerTarget,
  isAnsweringHeldRequest: activeHeldRequest !== null,
  updateRequestDraft,
  submitRequest,
  selectRequest,
  updateReplyDraft,
  submitReply,
  skipRequest,
  holdRequest,
  openHeldRequest,
  closeHeldRequest,
  reportRequest,
  reportReply,
  resetPrototype,
  hasViewerRepliedToSelected: selectedRequest
    ? hasViewerReplied(state, selectedRequest.id)
    : false,
};
```

- [x] **Step 4: Run tests to verify GREEN**

Run: `pnpm test app/today/prototype/useOnseolPrototype.test.tsx`

Expected: PASS.

- [x] **Step 5: Run today regression tests**

Run: `pnpm test app/today`

Expected: PASS — `/today` behavior is unaffected since it never reads the new fields.

- [x] **Step 6: Commit**

```bash
git add app/today/prototype/useOnseolPrototype.ts app/today/prototype/useOnseolPrototype.test.tsx
git commit -m "feat: add skip, hold, and answer target actions to the prototype hook"
```

---

### Task 4: Answer Session UI Components

**Files:**
- Create: `app/answer/prototype/format.ts`
- Create: `app/answer/prototype/labels.ts`
- Create: `app/answer/components/RequestBubble.tsx`
- Create: `app/answer/components/ReplyBubble.tsx`
- Create: `app/answer/components/AnswerLog.tsx`
- Create: `app/answer/components/AnswerComposer.tsx`
- Create: `app/answer/components/HoldPanel.tsx`
- Create: `app/answer/components/ReportConfirmDialog.tsx`

**Interfaces:**
- Produces: `formatTimestamp(iso)`, `buildAnonymousLabels(requests)`, and the presentational components below.
- Consumes: `OnseolRequest`, `OnseolReply` from `../../today/prototype/types`; `truncatePreview` from `../../today/prototype/model`; `ReportButton` from `../../today/components/ReportButton`.

- [x] **Step 1: Timestamp and label helpers** — 이후 리팩터링으로 `formatTimestamp`는 `app/lib/format.ts`(공용)로, `buildAnonymousLabels`는 `app/answer/prototype/labels.ts`가 아니라 `app/answer/labels.ts`로 이동함. `app/answer/prototype/` 폴더 자체는 더 이상 없음.

Create `app/answer/prototype/format.ts`:

```ts
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${month}월 ${day}일 ${hours}:${minutes}`;
}
```

Create `app/answer/prototype/labels.ts`:

```ts
import type { OnseolRequest } from "../../today/prototype/types";

export function buildAnonymousLabels(
  requests: OnseolRequest[],
): Map<string, string> {
  const labels = new Map<string, string>();
  let counter = 0;

  for (const request of requests) {
    if (!labels.has(request.authorId)) {
      counter += 1;
      labels.set(request.authorId, `익명 ${counter}`);
    }
  }

  return labels;
}
```

- [x] **Step 2: Request and reply bubbles**

Create `app/answer/components/RequestBubble.tsx`:

```tsx
import type { OnseolRequest } from "../../today/prototype/types";
import { ReportButton } from "../../today/components/ReportButton";
import { formatTimestamp } from "../prototype/format";

type RequestBubbleProps = {
  request: OnseolRequest;
  authorLabel: string;
  showActions: boolean;
  onReport?(): void;
  onSkip?(): void;
  onHold?(): void;
};

export function RequestBubble({
  request,
  authorLabel,
  showActions,
  onReport,
  onSkip,
  onHold,
}: RequestBubbleProps) {
  return (
    <article className="max-w-[85%] space-y-1 self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]">
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span className="font-semibold text-foreground">{authorLabel}</span>
        <time dateTime={request.createdAt}>
          {formatTimestamp(request.createdAt)}
        </time>
      </div>
      <p className="text-sm leading-6 text-foreground">{request.body}</p>
      {showActions ? (
        <div className="flex items-center gap-1 pt-1">
          <ReportButton label="신고" onReport={() => onReport?.()} />
          <button
            className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
            type="button"
            onClick={() => onSkip?.()}
          >
            스킵
          </button>
          <button
            className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
            type="button"
            onClick={() => onHold?.()}
          >
            보류
          </button>
        </div>
      ) : null}
    </article>
  );
}
```

Create `app/answer/components/ReplyBubble.tsx`:

```tsx
import type { OnseolReply } from "../../today/prototype/types";

type ReplyBubbleProps = {
  reply: OnseolReply;
};

export function ReplyBubble({ reply }: ReplyBubbleProps) {
  return (
    <article className="max-w-[85%] self-end rounded-lg bg-primary/10 px-4 py-3 sm:max-w-[70%]">
      <p className="text-sm leading-6 text-foreground">{reply.body}</p>
    </article>
  );
}
```

- [x] **Step 3: Log, composer, hold panel, report dialog**

Create `app/answer/components/AnswerLog.tsx`:

```tsx
import type { OnseolRequest, OnseolReply } from "../../today/prototype/types";
import { RequestBubble } from "./RequestBubble";
import { ReplyBubble } from "./ReplyBubble";

type AnswerLogProps = {
  entries: Array<{ request: OnseolRequest; reply: OnseolReply }>;
  currentRequest: OnseolRequest | null;
  authorLabels: Map<string, string>;
  onReport(requestId: string): void;
  onSkip(requestId: string): void;
  onHold(requestId: string): void;
};

export function AnswerLog({
  entries,
  currentRequest,
  authorLabels,
  onReport,
  onSkip,
  onHold,
}: AnswerLogProps) {
  return (
    <div
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-8"
      data-testid="answer-log"
    >
      {entries.map(({ request, reply }) => (
        <div className="flex flex-col gap-2" key={reply.id}>
          <RequestBubble
            authorLabel={authorLabels.get(request.authorId) ?? "익명"}
            request={request}
            showActions={false}
          />
          <ReplyBubble reply={reply} />
        </div>
      ))}
      {currentRequest ? (
        <RequestBubble
          authorLabel={authorLabels.get(currentRequest.authorId) ?? "익명"}
          request={currentRequest}
          showActions
          onHold={() => onHold(currentRequest.id)}
          onReport={() => onReport(currentRequest.id)}
          onSkip={() => onSkip(currentRequest.id)}
        />
      ) : (
        <p className="text-sm text-muted">지금은 답할 수 있는 온설이 없어요.</p>
      )}
    </div>
  );
}
```

Create `app/answer/components/AnswerComposer.tsx`:

```tsx
type AnswerComposerProps = {
  value: string;
  disabled: boolean;
  isAnsweringHeldRequest: boolean;
  onChange(value: string): void;
  onSubmit(): void;
  onCancelHeld(): void;
};

export function AnswerComposer({
  value,
  disabled,
  isAnsweringHeldRequest,
  onChange,
  onSubmit,
  onCancelHeld,
}: AnswerComposerProps) {
  return (
    <form
      className="border-t border-line bg-background px-5 py-4 sm:px-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p className="pb-2 text-xs text-muted">
        정답을 쓰지 않아도 됩니다. 짧게 들었다는 말이면 충분해요.
      </p>
      {isAnsweringHeldRequest ? (
        <div className="flex items-center justify-between pb-2 text-xs text-muted">
          <span>보류한 온설에 답하는 중이에요.</span>
          <button
            className="font-medium text-foreground underline"
            type="button"
            onClick={onCancelHeld}
          >
            그만두기
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor="answer-body">
          답변 남기기
        </label>
        <textarea
          className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          id="answer-body"
          maxLength={180}
          placeholder="그 마음이 오래 남을 수 있죠. 그래도 오늘 버틴 건 분명해요."
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !value.trim()}
          type="submit"
        >
          답변하기
        </button>
      </div>
    </form>
  );
}
```

Create `app/answer/components/HoldPanel.tsx`:

```tsx
import { truncatePreview } from "../../today/prototype/model";
import type { OnseolRequest } from "../../today/prototype/types";

type HoldPanelProps = {
  open: boolean;
  heldRequests: OnseolRequest[];
  onSelect(requestId: string): void;
  onClose(): void;
};

export function HoldPanel({
  open,
  heldRequests,
  onSelect,
  onClose,
}: HoldPanelProps) {
  if (!open) return null;

  return (
    <div
      aria-label="보류한 온설 목록"
      className="absolute inset-x-0 bottom-full z-10 max-h-72 overflow-y-auto border-t border-line bg-surface px-5 py-3 shadow-sm sm:px-8"
      role="dialog"
    >
      <div className="flex items-center justify-between pb-2">
        <p className="text-sm font-semibold text-foreground">보류 중</p>
        <button
          aria-label="보류함 닫기"
          className="text-sm text-muted"
          type="button"
          onClick={onClose}
        >
          닫기
        </button>
      </div>
      {heldRequests.length === 0 ? (
        <p className="py-4 text-sm text-muted">보류한 온설이 없어요.</p>
      ) : (
        <ul className="space-y-2">
          {heldRequests.map((request) => (
            <li key={request.id}>
              <button
                className="block w-full rounded-lg border border-line bg-background px-3 py-2 text-left text-sm text-foreground transition hover:bg-surface-muted"
                type="button"
                onClick={() => onSelect(request.id)}
              >
                {truncatePreview(request.body, 60)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Create `app/answer/components/ReportConfirmDialog.tsx`: — 이후 `app/components/shared/ActionConfirmDialog.tsx`로 일반화되어 report뿐 아니라 skip/hold 확인에도 재사용됨(스킵/보류도 확인 다이얼로그를 거치도록 동작이 바뀜 — 원래 계획엔 없던 확장). `ReportConfirmDialog.tsx` 파일 자체는 더 이상 없음.

```tsx
type ReportConfirmDialogProps = {
  open: boolean;
  onCancel(): void;
  onConfirm(): void;
};

export function ReportConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: ReportConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-5"
      role="dialog"
    >
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <p className="text-sm leading-6 text-foreground">
          이 온설을 신고할까요? 신고하면 이 글은 답하기 목록에서 사라집니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted transition hover:bg-surface-muted"
            type="button"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            type="button"
            onClick={onConfirm}
          >
            신고하기
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 4: Typecheck**

Run: `pnpm typecheck`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add app/answer/prototype/format.ts app/answer/prototype/labels.ts app/answer/components/RequestBubble.tsx app/answer/components/ReplyBubble.tsx app/answer/components/AnswerLog.tsx app/answer/components/AnswerComposer.tsx app/answer/components/HoldPanel.tsx app/answer/components/ReportConfirmDialog.tsx
git commit -m "feat: add answer session presentational components"
```

---

### Task 5: Assemble The Answer Session Page

**Files:**
- Create: `app/answer/AnswerSession.tsx`
- Create: `app/answer/AnswerSession.test.tsx`
- Modify: `app/answer/page.tsx`

**Interfaces:**
- Consumes: `useOnseolPrototype` and every component/helper from Tasks 3–4.
- Produces: the real `/answer` screen.

- [x] **Step 1: Write failing integration tests**

Create `app/answer/AnswerSession.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PROTOTYPE_STORAGE_KEYS } from "../today/prototype/storage-keys";
import { AnswerSession } from "./AnswerSession";

function seedRequests(
  overrides: Array<Record<string, unknown>> = [],
) {
  const base = [
    {
      id: "req-1",
      body: "오늘 실수한 일이 계속 떠올라요.",
      createdAt: new Date().toISOString(),
      authorId: "other-author-1",
      replyIds: [],
      reportCount: 0,
      hidden: false,
    },
    {
      id: "req-2",
      body: "끝내긴 했는데 잘한 건지 모르겠어요.",
      createdAt: new Date().toISOString(),
      authorId: "other-author-2",
      replyIds: [],
      reportCount: 0,
      hidden: false,
    },
    ...overrides,
  ];

  window.localStorage.setItem(
    PROTOTYPE_STORAGE_KEYS.requests,
    JSON.stringify(base),
  );
}

describe("AnswerSession", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows the first queued request and excludes my own requests", () => {
    seedRequests([
      {
        id: "req-mine",
        body: "내가 쓴 글",
        createdAt: new Date().toISOString(),
        authorId: "viewer-local",
        replyIds: [],
        reportCount: 0,
        hidden: false,
      },
    ]);

    render(<AnswerSession />);

    expect(
      screen.getByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();
    expect(screen.queryByText("내가 쓴 글")).not.toBeInTheDocument();
  });

  it("advances the queue when the current request is skipped", () => {
    seedRequests();

    render(<AnswerSession />);

    fireEvent.click(screen.getByRole("button", { name: "스킵" }));

    expect(
      screen.getByText("끝내긴 했는데 잘한 건지 모르겠어요."),
    ).toBeInTheDocument();
  });

  it("moves a held request into the hold panel and back out when answered", () => {
    seedRequests();

    render(<AnswerSession />);

    fireEvent.click(screen.getByRole("button", { name: "보류" }));
    expect(
      screen.getByRole("button", { name: "보류 중 (1)" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "보류 중 (1)" }));
    const panel = screen.getByLabelText("보류한 온설 목록");
    fireEvent.click(
      within(panel).getByText(/오늘 실수한 일이 계속 떠올라요/),
    );

    fireEvent.change(screen.getByLabelText("답변 남기기"), {
      target: { value: "짧게 들었다는 말을 전해요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "답변하기" }));

    expect(
      screen.getByRole("button", { name: "보류 중 (0)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("짧게 들었다는 말을 전해요."),
    ).toBeInTheDocument();
  });

  it("requires confirmation before a report takes effect", () => {
    seedRequests();

    render(<AnswerSession />);

    fireEvent.click(screen.getByRole("button", { name: "신고" }));
    expect(
      screen.getByText(/신고하면 이 글은 답하기 목록에서 사라집니다/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(
      screen.getByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "신고" }));
    fireEvent.click(screen.getByRole("button", { name: "신고하기" }));

    expect(
      screen.queryByText("오늘 실수한 일이 계속 떠올라요."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("끝내긴 했는데 잘한 건지 모르겠어요."),
    ).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run tests to verify RED**

Run: `pnpm test app/answer/AnswerSession.test.tsx`

Expected: FAIL because `AnswerSession` does not exist.

- [x] **Step 3: Implement `AnswerSession`** — 이후 백엔드 연동(PR #67 answer-interactions) 과정에서 localStorage 기반 `useOnseolPrototype` 대신 실제 API를 호출하는 `useAnswerQueue.ts`로 완전히 교체됨. 기능(스킵/보류/신고/답변 큐)은 실제 서버 데이터로 동작하며 살아있음.

Create `app/answer/AnswerSession.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { useOnseolPrototype } from "../today/prototype/useOnseolPrototype";
import { AnswerComposer } from "./components/AnswerComposer";
import { AnswerLog } from "./components/AnswerLog";
import { HoldPanel } from "./components/HoldPanel";
import { ReportConfirmDialog } from "./components/ReportConfirmDialog";
import { buildAnonymousLabels } from "./prototype/labels";

export function AnswerSession() {
  const prototype = useOnseolPrototype();
  const [holdPanelOpen, setHoldPanelOpen] = useState(false);
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);

  const currentTarget = prototype.currentAnswerTarget;
  const draft = currentTarget
    ? (prototype.state.replyDrafts[currentTarget.id] ?? "")
    : "";

  const authorLabels = useMemo(() => {
    const orderedRequests = [
      ...prototype.answerLog.map((entry) => entry.request),
      ...(currentTarget ? [currentTarget] : []),
    ];
    return buildAnonymousLabels(orderedRequests);
  }, [prototype.answerLog, currentTarget]);

  function confirmReport() {
    if (pendingReportId) prototype.reportRequest(pendingReportId);
    setPendingReportId(null);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <ServiceNav activePath="/answer" />
      <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col">
        <AnswerLog
          authorLabels={authorLabels}
          currentRequest={currentTarget}
          entries={prototype.answerLog}
          onHold={prototype.holdRequest}
          onReport={setPendingReportId}
          onSkip={prototype.skipRequest}
        />
        <HoldPanel
          heldRequests={prototype.heldRequests}
          open={holdPanelOpen}
          onClose={() => setHoldPanelOpen(false)}
          onSelect={(requestId) => {
            prototype.openHeldRequest(requestId);
            setHoldPanelOpen(false);
          }}
        />
        <div className="flex items-center justify-between border-t border-line px-5 pt-2 sm:px-8">
          <button
            className="text-xs font-medium text-muted transition hover:text-foreground"
            type="button"
            onClick={() => setHoldPanelOpen((open) => !open)}
          >
            보류 중 ({prototype.heldRequests.length})
          </button>
        </div>
        <AnswerComposer
          disabled={!currentTarget}
          isAnsweringHeldRequest={prototype.isAnsweringHeldRequest}
          value={draft}
          onCancelHeld={prototype.closeHeldRequest}
          onChange={(value) =>
            currentTarget && prototype.updateReplyDraft(currentTarget.id, value)
          }
          onSubmit={() => currentTarget && prototype.submitReply(currentTarget.id)}
        />
      </div>
      <ReportConfirmDialog
        open={pendingReportId !== null}
        onCancel={() => setPendingReportId(null)}
        onConfirm={confirmReport}
      />
    </div>
  );
}
```

- [x] **Step 4: Wire the route**

Modify `app/answer/page.tsx`:

```tsx
import { AnswerSession } from "./AnswerSession";

export default function AnswerPage() {
  return <AnswerSession />;
}
```

Delete the old placeholder markup entirely — `AnswerSession` already renders `ServiceNav`.

- [x] **Step 5: Run tests to verify GREEN**

Run: `pnpm test app/answer`

Expected: PASS.

- [x] **Step 6: Full verification**

Run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all commands pass.

- [x] **Step 7: Commit**

```bash
git add app/answer/AnswerSession.tsx app/answer/AnswerSession.test.tsx app/answer/page.tsx
git commit -m "feat: implement the answer session screen"
```

---

### Task 6: Work Log And PR

**Files:**
- Modify: a new or existing file under `docs/work-logs/` for 2026-08-19.

- [x] **Step 1: Record verification**

Create `docs/work-logs/2026-08-19-answer-session-implementation.md` with what changed, verification commands run, and known follow-ups pulled from the spec's "후속 결정 필요" list that were intentionally not built here (report confirmation copy iteration, `/me` surfacing of skip/hold state, guest hold access once real auth exists).

- [x] **Step 2: Commit**

```bash
git add docs/work-logs/2026-08-19-answer-session-implementation.md
git commit -m "docs: record answer session implementation notes"
```

- [x] **Step 3: Open PR**

Use the project PR workflow, base branch `v1`. PR body must mention:

- Chat-room session with skip/hold/report on the live request.
- Hold panel and how answering a held request reorders into the log by completion time.
- Report confirmation dialog (new behavior, `/today` untouched).
- Own-request exclusion from the queue.
- Verification commands and results.
