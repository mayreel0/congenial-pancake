# Onseol Read Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/read` placeholder with a real feed of request+reply threads, following `docs/superpowers/specs/2026-08-20-onseol-read-feed-spec.md`.

**Architecture:** Extend the shared `PrototypeState`/`useOnseolPrototype` hook (already the store behind `/today` and `/answer`) with a `savedRequestIds` field and a `getReadFeed` selector. Build `/read`-specific presentational components under `app/read/`, duplicating the small generic pieces `/answer` already duplicated the pattern for (`ActionConfirmDialog`, `formatTimestamp`) rather than reaching into `app/answer/*`, and writing new components where `/answer`'s shapes don't fit (`/read`'s bubbles have no hold/skip/composer, and multiple people can author replies to the same request, unlike `/answer` where every reply is the viewer's).

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Vitest, React Testing Library, jsdom, pnpm.

## Global Constraints

- Base branch is `v1`; do not push directly to `main` or `v1`.
- A read feed item = one request + **all** of its visible replies, shown in full from the start (no truncate/expand, no separate detail route).
- Replies render oldest-first within a card; cards themselves are ordered newest-request-first.
- A request with zero visible replies does not appear in the feed.
- The viewer's own requests DO appear in the feed (unlike `/answer`'s queue, which excludes them).
- `마음에 남기기` (save) is a bookmark/ribbon icon, never heart-shaped, toggles instantly with no confirmation dialog, and always shows a text label next to the icon.
- Report (on the request, and independently on each reply) goes through a confirmation dialog, reusing the `/answer` pattern.
- No `DateDivider`, no `flex-col-reverse` — this is a normal top-to-bottom feed, not a chat log.
- Single column at every width (`max-w-3xl`), never a multi-column grid.
- Keep copy 담백, consistent with the rest of the app.

---

## File Structure

- Modify `app/today/prototype/types.ts` — add `savedRequestIds: string[]` to `PrototypeState`.
- Modify `app/today/prototype/storage-keys.ts` — add `savedRequestIds` key.
- Modify `app/today/prototype/storage.ts` — read/write the new field with `[]` fallback.
- Modify `app/today/prototype/seed-data.ts` — initialize `savedRequestIds: []`.
- Modify `app/today/prototype/model.ts` — add `ReadFeedItem` type and `getReadFeed`.
- Modify `app/today/prototype/model.test.ts` — fix existing `PrototypeState` fixtures, add `getReadFeed` tests.
- Modify `app/today/prototype/useOnseolPrototype.ts` — add `readFeed`, `toggleSavedRequest`.
- Modify `app/today/prototype/useOnseolPrototype.test.tsx` — add tests for both.
- Create `app/read/components/icons.tsx` — `FlagIcon` (duplicated), `BookmarkIcon` (new).
- Create `app/read/components/SaveToggleButton.tsx` + test.
- Create `app/read/prototype/format.ts` — `formatTimestamp` (duplicated).
- Create `app/read/prototype/labels.ts` — `buildReadAuthorLabels` (new) + test.
- Create `app/read/components/ReadRequestBubble.tsx`.
- Create `app/read/components/ReadReplyBubble.tsx`.
- Create `app/read/components/ActionConfirmDialog.tsx` (duplicated).
- Create `app/read/components/ReadThread.tsx` + test.
- Create `app/read/ReadFeed.tsx` + test.
- Modify `app/read/page.tsx` — thin wrapper.
- Create a `docs/work-logs/` entry once implementation and manual verification are done.

---

### Task 1: `savedRequestIds` Data Plumbing

**Files:**
- Modify: `app/today/prototype/types.ts`, `storage-keys.ts`, `storage.ts`, `seed-data.ts`, `model.test.ts`

> 이후 PR #69(`/read` 실제 API 연동)에서 `/read`가 localStorage 프로토타입 스토어를 완전히 떠나 실제 백엔드(`GET /requests/feed`, `saved_replies` 모듈)로 옮겨가면서, 이 Task의 `savedRequestIds`/`getReadFeed` 관련 코드는 현재 코드베이스에 남아있지 않음(삭제됨). 저장 대상도 "요청 저장"에서 "답변 저장"(`saved_replies`, 응답별 저장)으로 바뀜. 아래 Task 1~3 항목은 당시엔 실제로 구현·머지되었던 것이 맞아 완료 처리함 — 이후 백엔드 연동 과정에서 대체되어 지워진 것뿐, 계획 미이행이 아님.

- [x] **Step 1: Add the field to `PrototypeState`**

In `types.ts`:

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
  savedRequestIds: string[];
};
```

- [x] **Step 2: Storage key**

In `storage-keys.ts`, add: `savedRequestIds: "onseol.prototype.savedRequestIds",`.

- [x] **Step 3: Read/write**

In `storage.ts`, in `readPrototypeState`:

```ts
const savedRequestIds = readJson<string[]>(
  PROTOTYPE_STORAGE_KEYS.savedRequestIds,
);
```

and add `savedRequestIds: savedRequestIds ?? []` to the returned object. In `writePrototypeState`, add:

```ts
writeJson(PROTOTYPE_STORAGE_KEYS.savedRequestIds, state.savedRequestIds);
```

- [x] **Step 4: Seed data**

In `seed-data.ts`, add `savedRequestIds: []` to the object returned by `createInitialPrototypeState`.

- [x] **Step 5: Fix existing fixtures**

`model.test.ts` builds several inline `PrototypeState` literals. Add `savedRequestIds: []` to every one of them so the file still type-checks.

- [x] **Step 6: Verify**

Run `pnpm typecheck`. Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add app/today/prototype/types.ts app/today/prototype/storage-keys.ts app/today/prototype/storage.ts app/today/prototype/seed-data.ts app/today/prototype/model.test.ts
git commit -m "feat: add savedRequestIds to the onseol prototype store"
```

---

### Task 2: `getReadFeed` Selector

**Files:**
- Modify: `app/today/prototype/model.ts`, `model.test.ts`

- [x] **Step 1: Write failing tests**

Add to `model.test.ts`:

```ts
import {
  getReadFeed,
  // ...existing imports
} from "./model";

describe("getReadFeed", () => {
  const state: PrototypeState = {
    viewer: { id: "viewer-local" },
    requests: [
      {
        id: "no-replies",
        body: "답변이 없는 요청",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "author-1",
        replyIds: [],
        reportCount: 0,
        hidden: false,
      },
      {
        id: "only-hidden-reply",
        body: "답변이 숨겨진 요청",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "author-2",
        replyIds: ["reply-hidden"],
        reportCount: 0,
        hidden: false,
      },
      {
        id: "mine",
        body: "내가 쓴 요청",
        createdAt: "2026-08-18T09:00:00.000Z",
        authorId: "viewer-local",
        replyIds: ["reply-mine"],
        reportCount: 0,
        hidden: false,
      },
      {
        id: "multi-reply",
        body: "답변이 여러 개인 요청",
        createdAt: "2026-08-19T12:00:00.000Z",
        authorId: "author-3",
        replyIds: ["reply-early", "reply-late"],
        reportCount: 0,
        hidden: false,
      },
    ],
    replies: [
      {
        id: "reply-hidden",
        requestId: "only-hidden-reply",
        body: "숨겨진 답변",
        createdAt: "2026-08-19T09:30:00.000Z",
        authorId: "author-4",
        reportCount: 1,
        hidden: true,
      },
      {
        id: "reply-mine",
        requestId: "mine",
        body: "내 요청에 달린 답변",
        createdAt: "2026-08-18T10:00:00.000Z",
        authorId: "author-5",
        reportCount: 0,
        hidden: false,
      },
      {
        id: "reply-late",
        requestId: "multi-reply",
        body: "나중에 달린 답변",
        createdAt: "2026-08-19T13:00:00.000Z",
        authorId: "author-6",
        reportCount: 0,
        hidden: false,
      },
      {
        id: "reply-early",
        requestId: "multi-reply",
        body: "먼저 달린 답변",
        createdAt: "2026-08-19T12:30:00.000Z",
        authorId: "author-7",
        reportCount: 0,
        hidden: false,
      },
    ],
    requestDraft: "",
    replyDrafts: {},
    selectedRequestId: null,
    skippedRequestIds: [],
    heldRequestIds: [],
    savedRequestIds: [],
  };

  it("excludes requests with no visible replies, includes the viewer's own, sorts newest-request-first", () => {
    const feed = getReadFeed(state);

    expect(feed.map((item) => item.request.id)).toEqual([
      "multi-reply",
      "no-replies" === feed[0]?.request.id ? "" : "mine",
    ].filter(Boolean));
  });

  it("orders replies within a card oldest-first", () => {
    const feed = getReadFeed(state);
    const multiReply = feed.find((item) => item.request.id === "multi-reply");

    expect(multiReply?.replies.map((reply) => reply.id)).toEqual([
      "reply-early",
      "reply-late",
    ]);
  });

  it("excludes a request whose only reply is hidden", () => {
    const feed = getReadFeed(state);

    expect(
      feed.some((item) => item.request.id === "only-hidden-reply"),
    ).toBe(false);
    expect(feed.some((item) => item.request.id === "no-replies")).toBe(false);
  });
});
```

(Simplify the first assertion if the interleaved ternary reads awkwardly — the intent is: only `multi-reply` and `mine` appear, `multi-reply` first since it's newer, `no-replies` and `only-hidden-reply` are absent.)

- [x] **Step 2: Run tests to verify RED**

Run: `pnpm test app/today/prototype/model.test.ts`. Expected: FAIL (`getReadFeed` does not exist).

- [x] **Step 3: Implement**

Add to `model.ts`:

```ts
export type ReadFeedItem = {
  request: OnseolRequest;
  replies: OnseolReply[];
};

export function getReadFeed(state: PrototypeState): ReadFeedItem[] {
  return getVisibleRequests(state)
    .map((request) => ({
      request,
      replies: getVisibleRepliesForRequest(state, request.id)
        .slice()
        .reverse(),
    }))
    .filter((item) => item.replies.length > 0)
    .sort((a, b) => b.request.createdAt.localeCompare(a.request.createdAt));
}
```

`getVisibleRepliesForRequest` already sorts newest-first; `.reverse()` gives the oldest-first conversational order this feed wants.

- [x] **Step 4: Run tests to verify GREEN, then commit**

```bash
pnpm test app/today/prototype/model.test.ts
git add app/today/prototype/model.ts app/today/prototype/model.test.ts
git commit -m "feat: add getReadFeed selector"
```

---

### Task 3: Hook — `readFeed` and `toggleSavedRequest`

**Files:**
- Modify: `app/today/prototype/useOnseolPrototype.ts`, `useOnseolPrototype.test.tsx`

- [x] **Step 1: Write failing tests**

Add to `useOnseolPrototype.test.tsx`:

```tsx
function ReadHarness() {
  const prototype = useOnseolPrototype();

  return (
    <div>
      <p data-testid="feed-count">{prototype.readFeed.length}</p>
      {prototype.readFeed.map((item) => (
        <button
          key={item.request.id}
          onClick={() => prototype.toggleSavedRequest(item.request.id)}
        >
          toggle {item.request.body}
        </button>
      ))}
      <p data-testid="saved-count">
        {prototype.state.savedRequestIds.length}
      </p>
    </div>
  );
}

describe("useOnseolPrototype read feed", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("toggles a request in and out of savedRequestIds and persists it", () => {
    render(<ReadHarness />);

    const target = screen.getAllByRole("button", { name: /^toggle / })[0];
    fireEvent.click(target);
    expect(screen.getByTestId("saved-count")).toHaveTextContent("1");

    fireEvent.click(target);
    expect(screen.getByTestId("saved-count")).toHaveTextContent("0");
  });
});
```

(Seed data already gives two sample requests each with one reply, so `readFeed` is non-empty by default — no localStorage seeding needed for this test.)

- [x] **Step 2: Run tests to verify RED**

Run: `pnpm test app/today/prototype/useOnseolPrototype.test.tsx`. Expected: FAIL.

- [x] **Step 3: Implement**

In `useOnseolPrototype.ts`, import `getReadFeed` (and `ReadFeedItem` type) from `./model`. Add near the other memoized derivations:

```ts
const readFeed = useMemo(() => getReadFeed(state), [state]);
```

Add the action:

```ts
function toggleSavedRequest(requestId: string): void {
  updateState((current) => {
    const saved = current.savedRequestIds.includes(requestId);
    return {
      ...current,
      savedRequestIds: saved
        ? current.savedRequestIds.filter((id) => id !== requestId)
        : [...current.savedRequestIds, requestId],
    };
  });
}
```

Extend `UseOnseolPrototypeResult` with `readFeed: ReadFeedItem[];` and `toggleSavedRequest(requestId: string): void;`, and add both to the returned object.

- [x] **Step 4: Run tests, then today/answer regression, then commit**

```bash
pnpm test app/today/prototype/useOnseolPrototype.test.tsx
pnpm test app/today app/answer
git add app/today/prototype/useOnseolPrototype.ts app/today/prototype/useOnseolPrototype.test.tsx
git commit -m "feat: add read feed and save-toggle to the prototype hook"
```

---

### Task 4: Icons and `SaveToggleButton`

**Files:**
- Create: `app/read/components/icons.tsx`, `app/read/components/SaveToggleButton.tsx` + test

- [x] **Step 1: Icons** — `app/read/components/icons.tsx`(기능별 복제본)는 없음. `FlagIcon`/`BookmarkIcon`은 `/answer`가 먼저 만든 패턴을 이어받아 `app/components/shared/icons.tsx`로 공유됨(계획의 "기능별로 독립 복제" 방침과 반대 방향으로 나중에 통합됨).

Create `app/read/components/icons.tsx`:

```tsx
type IconProps = {
  className?: string;
};

export function FlagIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={1.8}
        x1="5"
        x2="5"
        y1="3"
        y2="21"
      />
      <path
        d="M5 4.25h12.2c.95 0 1.4 1.16.7 1.82L14.6 9l3.3 2.93c.7.66.25 1.82-.7 1.82H5V4.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BookmarkIcon({
  className,
  filled,
}: IconProps & { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      viewBox="0 0 24 24"
    >
      <path
        d="M7 3.5A1.5 1.5 0 0 1 8.5 2h7A1.5 1.5 0 0 1 17 3.5V21l-5-3.6L7 21V3.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

(`FlagIcon` is a verbatim copy of `app/answer/components/icons.tsx`'s version — keep them independently duplicated per this feature's file-ownership convention, don't import across features.)

- [x] **Step 2: Write failing test for `SaveToggleButton`**

Create `app/read/components/SaveToggleButton.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SaveToggleButton } from "./SaveToggleButton";

describe("SaveToggleButton", () => {
  it("shows unsaved state and calls onToggle", () => {
    const onToggle = vi.fn();
    render(<SaveToggleButton saved={false} onToggle={onToggle} />);

    const button = screen.getByRole("button", { name: "마음에 남기기" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("shows saved state", () => {
    render(<SaveToggleButton saved onToggle={() => {}} />);

    expect(
      screen.getByRole("button", { name: /마음에 남긴 온설/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [x] **Step 3: Run to verify RED, then implement**

Create `app/read/components/SaveToggleButton.tsx`: — 별도 컴포넌트 파일로는 존재하지 않고 `ReadReplyBubble.tsx` 내부에 인라인으로 통합됨. 더 중요한 차이: 저장 대상이 "요청 전체"(`savedRequestIds`)가 아니라 "개별 답변"(`saved_replies` 테이블, `GET/POST/DELETE /replies/:id/save`)으로 바뀜 — 계획의 저장 단위 자체가 변경됨.

```tsx
import { BookmarkIcon } from "./icons";

type SaveToggleButtonProps = {
  saved: boolean;
  onToggle(): void;
};

export function SaveToggleButton({ saved, onToggle }: SaveToggleButtonProps) {
  return (
    <button
      aria-label={saved ? "마음에 남긴 온설, 눌러서 지우기" : "마음에 남기기"}
      aria-pressed={saved}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
      type="button"
      onClick={onToggle}
    >
      <BookmarkIcon className="h-4 w-4" filled={saved} />
      마음에 남기기
    </button>
  );
}
```

- [x] **Step 4: Verify and commit**

```bash
pnpm test app/read
pnpm lint
git add app/read/components/icons.tsx app/read/components/SaveToggleButton.tsx app/read/components/SaveToggleButton.test.tsx
git commit -m "feat: add read feed icons and save toggle button"
```

---

### Task 5: `formatTimestamp` and `buildReadAuthorLabels`

**Files:**
- Create: `app/read/prototype/format.ts`, `app/read/prototype/labels.ts` + test

- [x] **Step 1: `format.ts`** (duplicate of `/answer`'s) — 이후 `app/lib/format.ts`로 공용화됨(중복 제거).

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

- [x] **Step 2: Write failing test for `buildReadAuthorLabels`**

Create `app/read/prototype/labels.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ReadFeedItem } from "../../today/prototype/model";
import { buildReadAuthorLabels } from "./labels";

describe("buildReadAuthorLabels", () => {
  it("labels request and reply authors in first-seen order, reusing labels for repeat authors", () => {
    const items: ReadFeedItem[] = [
      {
        request: {
          id: "r1",
          body: "요청1",
          createdAt: "2026-08-19T09:00:00.000Z",
          authorId: "author-a",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        replies: [
          {
            id: "reply1",
            requestId: "r1",
            body: "답변1",
            createdAt: "2026-08-19T09:30:00.000Z",
            authorId: "author-b",
            reportCount: 0,
            hidden: false,
          },
        ],
      },
      {
        request: {
          id: "r2",
          body: "요청2",
          createdAt: "2026-08-18T09:00:00.000Z",
          authorId: "author-b",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        replies: [
          {
            id: "reply2",
            requestId: "r2",
            body: "답변2",
            createdAt: "2026-08-18T09:30:00.000Z",
            authorId: "author-a",
            reportCount: 0,
            hidden: false,
          },
        ],
      },
    ];

    const labels = buildReadAuthorLabels(items);

    expect(labels.get("author-a")).toBe("익명 1");
    expect(labels.get("author-b")).toBe("익명 2");
  });
});
```

- [x] **Step 3: Run to verify RED, then implement**

Create `app/read/prototype/labels.ts`: — 실제 구현은 `buildReadAuthorLabels`(순차 "익명 N")가 아니라 `app/read/labels.ts`의 `buildFeedItemLabels`로 바뀜: 백엔드가 authorId/guestId를 절대 노출하지 않고 스레드별 `authorSlot`만 내려주므로(`apps/api/src/requests/feed-author-slots.ts`), 요청 id 해시로 오프셋을 준 닉네임 풀에서 라벨을 뽑는 방식으로 재설계됨. `docs/decisions/2026-08-23-onseol-read-feed-decisions.md` 참고.

```ts
import type { ReadFeedItem } from "../../today/prototype/model";

export function buildReadAuthorLabels(
  items: ReadFeedItem[],
): Map<string, string> {
  const labels = new Map<string, string>();
  let counter = 0;

  function assign(authorId: string): void {
    if (labels.has(authorId)) return;
    counter += 1;
    labels.set(authorId, `익명 ${counter}`);
  }

  for (const item of items) {
    assign(item.request.authorId);
    for (const reply of item.replies) {
      assign(reply.authorId);
    }
  }

  return labels;
}
```

- [x] **Step 4: Verify and commit**

```bash
pnpm test app/read
git add app/read/prototype/format.ts app/read/prototype/labels.ts app/read/prototype/labels.test.ts
git commit -m "feat: add read feed timestamp and author label helpers"
```

---

### Task 6: `ReadRequestBubble` and `ReadReplyBubble`

**Files:**
- Create both components (no dedicated test files — covered at the `ReadThread`/`ReadFeed` integration level, matching how `/answer`'s `ReplyBubble` has no standalone test).

- [x] **Step 1: `ReadRequestBubble.tsx`**

```tsx
import type { OnseolRequest } from "../../today/prototype/types";
import { formatTimestamp } from "../prototype/format";
import { FlagIcon } from "./icons";

type ReadRequestBubbleProps = {
  request: OnseolRequest;
  authorLabel: string;
  onReport(): void;
};

export function ReadRequestBubble({
  request,
  authorLabel,
  onReport,
}: ReadRequestBubbleProps) {
  return (
    <article className="max-w-[85%] space-y-1.5 self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">{authorLabel}</p>
        <button
          aria-label="이 온설 신고하기"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted transition hover:bg-surface-muted hover:text-foreground"
          type="button"
          onClick={onReport}
        >
          <FlagIcon className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm leading-6 text-foreground">{request.body}</p>
      <time
        className="block text-xs text-muted"
        dateTime={request.createdAt}
        suppressHydrationWarning
      >
        {formatTimestamp(request.createdAt)}
      </time>
    </article>
  );
}
```

- [x] **Step 2: `ReadReplyBubble.tsx`**

```tsx
import type { OnseolReply } from "../../today/prototype/types";
import { formatTimestamp } from "../prototype/format";
import { FlagIcon } from "./icons";

type ReadReplyBubbleProps = {
  reply: OnseolReply;
  authorLabel: string;
  onReport(): void;
};

export function ReadReplyBubble({
  reply,
  authorLabel,
  onReport,
}: ReadReplyBubbleProps) {
  return (
    <article className="max-w-[85%] space-y-1.5 self-end rounded-lg bg-primary/10 px-4 py-3 sm:max-w-[70%]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">{authorLabel}</p>
        <button
          aria-label="이 답변 신고하기"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted transition hover:bg-surface-muted hover:text-foreground"
          type="button"
          onClick={onReport}
        >
          <FlagIcon className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm leading-6 text-foreground">{reply.body}</p>
      <time
        className="block text-xs text-muted"
        dateTime={reply.createdAt}
        suppressHydrationWarning
      >
        {formatTimestamp(reply.createdAt)}
      </time>
    </article>
  );
}
```

- [x] **Step 3: Verify and commit**

```bash
pnpm typecheck
pnpm lint
git add app/read/components/ReadRequestBubble.tsx app/read/components/ReadReplyBubble.tsx
git commit -m "feat: add read feed request and reply bubbles"
```

---

### Task 7: `ActionConfirmDialog` and `ReadThread`

**Files:**
- Create: `app/read/components/ActionConfirmDialog.tsx` (duplicate), `app/read/components/ReadThread.tsx` + test

- [x] **Step 1: Duplicate the confirm dialog** — `/read` 전용 복제본은 없고 `app/components/shared/ActionConfirmDialog.tsx`를 그대로 가져다 씀(공유화).

Create `app/read/components/ActionConfirmDialog.tsx` with the exact same content as `app/answer/components/ActionConfirmDialog.tsx` (props: `open`, `message`, `confirmLabel`, `onCancel()`, `onConfirm()`).

- [x] **Step 2: Write failing test for `ReadThread`**

Create `app/read/components/ReadThread.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReadFeedItem } from "../../today/prototype/model";
import { ReadThread } from "./ReadThread";

const item: ReadFeedItem = {
  request: {
    id: "req-1",
    body: "오늘 실수한 일이 계속 떠올라요.",
    createdAt: "2026-08-19T09:00:00.000Z",
    authorId: "author-1",
    replyIds: ["reply-1"],
    reportCount: 0,
    hidden: false,
  },
  replies: [
    {
      id: "reply-1",
      requestId: "req-1",
      body: "괜히 커 보일 때가 있죠.",
      createdAt: "2026-08-19T09:30:00.000Z",
      authorId: "author-2",
      reportCount: 0,
      hidden: false,
    },
  ],
};

describe("ReadThread", () => {
  it("renders the request and every reply, and wires save/report callbacks", () => {
    const onToggleSave = vi.fn();
    const onReportRequest = vi.fn();
    const onReportReply = vi.fn();

    render(
      <ReadThread
        authorLabels={new Map([
          ["author-1", "익명 1"],
          ["author-2", "익명 2"],
        ])}
        item={item}
        saved={false}
        onReportReply={onReportReply}
        onReportRequest={onReportRequest}
        onToggleSave={onToggleSave}
      />,
    );

    expect(
      screen.getByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();
    expect(screen.getByText("괜히 커 보일 때가 있죠.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "마음에 남기기" }));
    expect(onToggleSave).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "이 온설 신고하기" }));
    expect(onReportRequest).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "이 답변 신고하기" }));
    expect(onReportReply).toHaveBeenCalledWith("reply-1");
  });
});
```

- [x] **Step 3: Run to verify RED, then implement**

Create `app/read/components/ReadThread.tsx`:

```tsx
import type { ReadFeedItem } from "../../today/prototype/model";
import { ReadReplyBubble } from "./ReadReplyBubble";
import { ReadRequestBubble } from "./ReadRequestBubble";
import { SaveToggleButton } from "./SaveToggleButton";

type ReadThreadProps = {
  item: ReadFeedItem;
  authorLabels: Map<string, string>;
  saved: boolean;
  onToggleSave(): void;
  onReportRequest(): void;
  onReportReply(replyId: string): void;
};

export function ReadThread({
  item,
  authorLabels,
  saved,
  onToggleSave,
  onReportRequest,
  onReportReply,
}: ReadThreadProps) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-background px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2">
        <ReadRequestBubble
          authorLabel={authorLabels.get(item.request.authorId) ?? "익명"}
          request={item.request}
          onReport={onReportRequest}
        />
        {item.replies.map((reply) => (
          <ReadReplyBubble
            authorLabel={authorLabels.get(reply.authorId) ?? "익명"}
            key={reply.id}
            reply={reply}
            onReport={() => onReportReply(reply.id)}
          />
        ))}
      </div>
      <SaveToggleButton saved={saved} onToggle={onToggleSave} />
    </section>
  );
}
```

- [x] **Step 4: Verify and commit**

```bash
pnpm test app/read
pnpm lint
git add app/read/components/ActionConfirmDialog.tsx app/read/components/ReadThread.tsx app/read/components/ReadThread.test.tsx
git commit -m "feat: add read thread card"
```

---

### Task 8: `ReadFeed` Session Component + `page.tsx`

**Files:**
- Create: `app/read/ReadFeed.tsx`, `app/read/ReadFeed.test.tsx`
- Modify: `app/read/page.tsx`

- [x] **Step 1: Write failing integration tests**

Create `app/read/ReadFeed.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PROTOTYPE_STORAGE_KEYS } from "../today/prototype/storage-keys";
import { ReadFeed } from "./ReadFeed";

function seed(requests: Array<Record<string, unknown>>, replies: Array<Record<string, unknown>>) {
  window.localStorage.setItem(
    PROTOTYPE_STORAGE_KEYS.requests,
    JSON.stringify(requests),
  );
  window.localStorage.setItem(
    PROTOTYPE_STORAGE_KEYS.replies,
    JSON.stringify(replies),
  );
}

describe("ReadFeed", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows only requests with at least one visible reply, including the viewer's own", async () => {
    seed(
      [
        {
          id: "with-reply",
          body: "답변이 있는 요청",
          createdAt: new Date().toISOString(),
          authorId: "other-author",
          replyIds: ["r1"],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "no-reply",
          body: "답변이 없는 요청",
          createdAt: new Date().toISOString(),
          authorId: "other-author",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "mine",
          body: "내가 쓴 요청",
          createdAt: new Date().toISOString(),
          authorId: "viewer-local",
          replyIds: ["r2"],
          reportCount: 0,
          hidden: false,
        },
      ],
      [
        {
          id: "r1",
          requestId: "with-reply",
          body: "답변입니다",
          createdAt: new Date().toISOString(),
          authorId: "replier-1",
          reportCount: 0,
          hidden: false,
        },
        {
          id: "r2",
          requestId: "mine",
          body: "내 요청에 달린 답변",
          createdAt: new Date().toISOString(),
          authorId: "replier-2",
          reportCount: 0,
          hidden: false,
        },
      ],
    );

    render(<ReadFeed />);

    expect(await screen.findByText("답변이 있는 요청")).toBeInTheDocument();
    expect(screen.getByText("내가 쓴 요청")).toBeInTheDocument();
    expect(screen.queryByText("답변이 없는 요청")).not.toBeInTheDocument();
  });

  it("toggles save instantly with no confirmation", async () => {
    seed(
      [
        {
          id: "req-1",
          body: "요청",
          createdAt: new Date().toISOString(),
          authorId: "other-author",
          replyIds: ["r1"],
          reportCount: 0,
          hidden: false,
        },
      ],
      [
        {
          id: "r1",
          requestId: "req-1",
          body: "답변",
          createdAt: new Date().toISOString(),
          authorId: "replier-1",
          reportCount: 0,
          hidden: false,
        },
      ],
    );

    render(<ReadFeed />);
    await screen.findByText("요청");

    fireEvent.click(screen.getByRole("button", { name: "마음에 남기기" }));

    expect(
      screen.getByRole("button", { name: /마음에 남긴 온설/ }),
    ).toBeInTheDocument();
  });

  it("requires confirmation before a report removes an item, and removes the whole card when the only reply is reported", async () => {
    seed(
      [
        {
          id: "req-1",
          body: "요청 본문",
          createdAt: new Date().toISOString(),
          authorId: "other-author",
          replyIds: ["r1"],
          reportCount: 0,
          hidden: false,
        },
      ],
      [
        {
          id: "r1",
          requestId: "req-1",
          body: "유일한 답변",
          createdAt: new Date().toISOString(),
          authorId: "replier-1",
          reportCount: 0,
          hidden: false,
        },
      ],
    );

    render(<ReadFeed />);
    await screen.findByText("요청 본문");

    fireEvent.click(screen.getByRole("button", { name: "이 답변 신고하기" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByText("요청 본문")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이 답변 신고하기" }));
    fireEvent.click(screen.getByRole("button", { name: "신고하기" }));

    expect(screen.queryByText("요청 본문")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing qualifies", async () => {
    seed([], []);

    render(<ReadFeed />);

    expect(
      await screen.findByText("아직 읽을 수 있는 온설이 없어요."),
    ).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run to verify RED**

Run: `pnpm test app/read/ReadFeed.test.tsx`. Expected: FAIL (`ReadFeed` does not exist).

- [x] **Step 3: Implement `ReadFeed.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { useOnseolPrototype } from "../today/prototype/useOnseolPrototype";
import { ActionConfirmDialog } from "./components/ActionConfirmDialog";
import { ReadThread } from "./components/ReadThread";
import { buildReadAuthorLabels } from "./prototype/labels";

type PendingReport =
  | { kind: "request"; requestId: string }
  | { kind: "reply"; requestId: string; replyId: string };

export function ReadFeed() {
  const prototype = useOnseolPrototype();
  const [pendingReport, setPendingReport] = useState<PendingReport | null>(
    null,
  );

  const savedSet = useMemo(
    () => new Set(prototype.state.savedRequestIds),
    [prototype.state.savedRequestIds],
  );
  const authorLabels = useMemo(
    () => buildReadAuthorLabels(prototype.readFeed),
    [prototype.readFeed],
  );

  function confirmPendingReport() {
    if (!pendingReport) return;

    if (pendingReport.kind === "request") {
      prototype.reportRequest(pendingReport.requestId);
    } else {
      prototype.reportReply(pendingReport.replyId);
    }

    setPendingReport(null);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/read" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-10 sm:px-8">
        {prototype.readFeed.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            아직 읽을 수 있는 온설이 없어요.
          </p>
        ) : (
          prototype.readFeed.map((item) => (
            <ReadThread
              authorLabels={authorLabels}
              item={item}
              key={item.request.id}
              saved={savedSet.has(item.request.id)}
              onReportReply={(replyId) =>
                setPendingReport({
                  kind: "reply",
                  requestId: item.request.id,
                  replyId,
                })
              }
              onReportRequest={() =>
                setPendingReport({ kind: "request", requestId: item.request.id })
              }
              onToggleSave={() => prototype.toggleSavedRequest(item.request.id)}
            />
          ))
        )}
      </main>
      <ActionConfirmDialog
        confirmLabel="신고하기"
        message={
          pendingReport?.kind === "reply"
            ? "이 답변을 신고할까요? 신고하면 이 답변은 더 이상 보이지 않아요."
            : "이 온설을 신고할까요? 신고하면 이 글은 읽기 목록에서 사라집니다."
        }
        open={pendingReport !== null}
        onCancel={() => setPendingReport(null)}
        onConfirm={confirmPendingReport}
      />
    </div>
  );
}
```

- [x] **Step 4: Rewrite `page.tsx`**

```tsx
import { ReadFeed } from "./ReadFeed";

export default function ReadPage() {
  return <ReadFeed />;
}
```

- [x] **Step 5: Run tests to verify GREEN**

Run: `pnpm test app/read`. Expected: PASS.

- [x] **Step 6: Full verification**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

- [x] **Step 7: Commit**

```bash
git add app/read/ReadFeed.tsx app/read/ReadFeed.test.tsx app/read/page.tsx
git commit -m "feat: implement the read feed screen"
```

---

### Task 9: Manual Verification In Chrome, Then Work Log

- [x] **Step 1: Seed varied data and check layout**

Run `pnpm dev`, open `/read` in Chrome, seed `localStorage` (via the `PROTOTYPE_STORAGE_KEYS`, same technique used to verify `/answer`) with: a request with 3+ replies from different authors, a request with exactly 1 reply, the viewer's own request with a reply, and confirm:
- Single column at both mobile and desktop widths.
- Replies render oldest-first, request always above its replies.
- Save toggles instantly (no dialog), bookmark fills in, persists across reload.
- Reporting a reply removes just that bubble; reporting a request's only reply removes the whole card.
- No console hydration warnings on the timestamps.

- [x] **Step 2: Work log**

Add `docs/work-logs/2026-08-20-read-feed-implementation.md` recording what changed, how it was verified (automated + manual), and any judgment calls made during implementation.

- [x] **Step 3: Commit and open PR**

```bash
git add docs/work-logs/2026-08-20-read-feed-implementation.md
git commit -m "docs: record read feed implementation notes"
```

Open PR against `v1`. Body should mention: the read-feed content model (full thread, not truncated), the save-toggle behavior (instant, no dialog), report behavior on both requests and replies, and verification results.
