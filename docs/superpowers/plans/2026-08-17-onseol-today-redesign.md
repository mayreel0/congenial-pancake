# Onseol Today Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the current all-in-one `/today` prototype screen with a focused first-entry experience: basic prompt, rotating Onseol line, composer, and visible submit lifecycle.

**Architecture:** Keep the existing localStorage prototype state and hook as the data source. Add small pure helpers for `/today` entry selection and a focused entry screen component that consumes the hook. Do not build `/answer`, `/read`, or `/me` in this PR.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Vitest, React Testing Library, jsdom, pnpm.

## Global Constraints

- Base branch is `v1`; do not push directly to `main` or `v1`.
- `/today` first screen order is: 기본 문구 -> 순환 온설 문구 -> 요청 입력창과 보내기 버튼 -> 제출 상태 메시지 -> 작은 활동 문장.
- First screen must stay simple like the ChatGPT first screen: no multi-section dashboard, no lower recent-card feed, no helper answer link.
- Initial `/today` must not show a `누군가에게 답하기` helper link near the composer; users access answer flow from primary navigation later.
- Rotating Onseol uses recent cached Onseol first, fallback samples if cache is empty.
- Rotating Onseol must not immediately include the current viewer's newly submitted request.
- Default transition is soft vertical wipe, interval 5 seconds, duration 600ms, easing close to `cubic-bezier(0.22, 1, 0.36, 1)`.
- Rotation stops while the user is typing.
- `prefers-reduced-motion` must avoid wipe and use immediate swap or minimal fade.
- Composer starts like a single-line composer but is implemented as a textarea that expands up to 3-4 lines.
- Initial UI exposes only text input and send button; no disabled image button.
- Submit lifecycle must show pending, block duplicate submits, then show `남겨졌어요`, clear the input, and stay on `/today`.
- Keep UI copy realistic and 담백; avoid AI prompt-chip UI.

---

## File Structure

- Modify `app/today/prototype/model.ts`
  - Add pure helper for recent non-viewer requests used by `/today`.
- Modify `app/today/prototype/model.test.ts`
  - Add tests for recent cached Onseol selection, fallback behavior, hidden filtering, and viewer exclusion.
- Modify `app/today/prototype/useOnseolPrototype.ts`
  - Add request submit lifecycle state and async submit behavior.
- Add `app/today/prototype/useOnseolPrototype.test.tsx`
  - Test pending duplicate guard and success lifecycle through a tiny test component.
- Replace or significantly simplify `app/today/components/RequestComposer.tsx`
  - Convert the existing large composer into a compact auto-growing composer with pending/success UI props.
- Modify `app/today/components/RequestComposer.test.tsx`
  - Update tests for compact composer behavior.
- Add `app/today/components/RotatingOnseolLine.tsx`
  - Show one rotating Onseol line with soft vertical wipe classes.
- Add `app/today/components/RotatingOnseolLine.test.tsx`
  - Test fallback/current message rendering and pause behavior hooks exposed through props.
- Modify `app/globals.css`
  - Add soft vertical wipe animation and reduced-motion override.
- Modify `app/today/TodayPrototype.tsx`
  - Remove the all-in-one dashboard sections from `/today` and compose the focused first-entry screen.
- Add `docs/work-logs/2026-08-17-today-redesign-implementation.md`
  - Record implementation decisions and verification results for later wiki promotion.

Do not modify `app/today/page.tsx` unless the component export name changes. Prefer keeping `TodayPrototype` exported so route wiring stays stable for this PR.

---

### Task 1: Recent Onseol Selection Helper

**Files:**
- Modify: `app/today/prototype/model.ts`
- Modify: `app/today/prototype/model.test.ts`

**Interfaces:**
- Consumes: `PrototypeState`, `OnseolRequest`
- Produces:
  - `getRecentNonViewerRequests(state: PrototypeState, limit?: number): OnseolRequest[]`
  - `getTodayEntryMessages(state: PrototypeState, fallbackMessages: string[], limit?: number): string[]`
  - Sort order: newest first by `createdAt`
  - Filters: `hidden === false`, `authorId !== state.viewer.id`

- [x] **Step 1: Add failing tests for non-viewer recent requests**

Update the existing `./model` import in `app/today/prototype/model.test.ts` so it includes the new helpers, then add these tests:

```ts
import { getRecentNonViewerRequests, getTodayEntryMessages } from "./model";

describe("getRecentNonViewerRequests", () => {
  it("returns recent visible requests that were not written by the viewer", () => {
    const state: PrototypeState = {
      viewer: { id: "viewer-local" },
      requests: [
        {
          id: "mine-new",
          body: "내가 방금 쓴 글",
          createdAt: "2026-08-17T12:00:00.000Z",
          authorId: "viewer-local",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "other-new",
          body: "다른 사람이 쓴 최신 글",
          createdAt: "2026-08-17T11:00:00.000Z",
          authorId: "author-1",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "other-hidden",
          body: "숨겨진 글",
          createdAt: "2026-08-17T10:00:00.000Z",
          authorId: "author-2",
          replyIds: [],
          reportCount: 1,
          hidden: true,
        },
        {
          id: "other-old",
          body: "다른 사람이 쓴 예전 글",
          createdAt: "2026-08-16T10:00:00.000Z",
          authorId: "author-3",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
      ],
      replies: [],
      requestDraft: "",
      replyDrafts: {},
      selectedRequestId: null,
    };

    expect(getRecentNonViewerRequests(state).map((request) => request.id)).toEqual([
      "other-new",
      "other-old",
    ]);
  });

  it("limits the returned requests when a limit is provided", () => {
    const state: PrototypeState = {
      viewer: { id: "viewer-local" },
      requests: [
        {
          id: "other-new",
          body: "최신 글",
          createdAt: "2026-08-17T11:00:00.000Z",
          authorId: "author-1",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "other-old",
          body: "예전 글",
          createdAt: "2026-08-16T10:00:00.000Z",
          authorId: "author-2",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
      ],
      replies: [],
      requestDraft: "",
      replyDrafts: {},
      selectedRequestId: null,
    };

    expect(getRecentNonViewerRequests(state, 1).map((request) => request.id)).toEqual([
      "other-new",
    ]);
  });

  it("returns fallback messages when there are no visible non-viewer requests", () => {
    const state: PrototypeState = {
      viewer: { id: "viewer-local" },
      requests: [
        {
          id: "mine-new",
          body: "내가 쓴 글",
          createdAt: "2026-08-17T12:00:00.000Z",
          authorId: "viewer-local",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
      ],
      replies: [],
      requestDraft: "",
      replyDrafts: {},
      selectedRequestId: null,
    };

    expect(getTodayEntryMessages(state, ["기본 샘플"])).toEqual(["기본 샘플"]);
  });
});
```

- [x] **Step 2: Run tests and verify RED**

Run: `pnpm test app/today/prototype/model.test.ts`

Expected: FAIL because `getRecentNonViewerRequests` and `getTodayEntryMessages` are not exported.

- [x] **Step 3: Implement the helper**

Add to `app/today/prototype/model.ts`:

```ts
export function getRecentNonViewerRequests(
  state: PrototypeState,
  limit = 5,
): OnseolRequest[] {
  return getVisibleRequests(state)
    .filter((request) => request.authorId !== state.viewer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getTodayEntryMessages(
  state: PrototypeState,
  fallbackMessages: string[],
  limit = 5,
): string[] {
  const recentMessages = getRecentNonViewerRequests(state, limit).map(
    (request) => request.body,
  );

  return recentMessages.length > 0 ? recentMessages : fallbackMessages;
}
```

- [x] **Step 4: Run tests and verify GREEN**

Run: `pnpm test app/today/prototype/model.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add app/today/prototype/model.ts app/today/prototype/model.test.ts
git commit -m "test: cover today recent request selection"
```

---

### Task 2: Request Submit Lifecycle In Hook

**Files:**
- Modify: `app/today/prototype/useOnseolPrototype.ts`
- Add: `app/today/prototype/useOnseolPrototype.test.tsx`

**Interfaces:**
- Consumes:
  - `state.requestDraft`
  - `updateRequestDraft(value: string): void`
- Produces:
  - `requestSubmitStatus: "idle" | "pending" | "success"`
  - `submitRequest(): Promise<void>`
  - `requestSubmitStatus` returns to `idle` when the user edits the draft after success.
  - Pending duration constant: `REQUEST_SUBMIT_PENDING_MS = 450`

- [x] **Step 1: Add failing lifecycle tests**

Create `app/today/prototype/useOnseolPrototype.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useOnseolPrototype } from "./useOnseolPrototype";

function Harness() {
  const prototype = useOnseolPrototype();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void prototype.submitRequest();
      }}
    >
      <p data-testid="status">{prototype.requestSubmitStatus}</p>
      <p data-testid="request-count">{prototype.state.requests.length}</p>
      <textarea
        aria-label="request"
        value={prototype.state.requestDraft}
        onChange={(event) => prototype.updateRequestDraft(event.target.value)}
      />
      <button
        disabled={prototype.requestSubmitStatus === "pending"}
        type="submit"
      >
        submit
      </button>
    </form>
  );
}

describe("useOnseolPrototype request submission", () => {
  it("shows pending, blocks duplicate submission, then clears the draft on success", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness />);

    await user.type(screen.getByLabelText("request"), "오늘은 조금 지쳤어요.");
    await user.click(screen.getByRole("button", { name: "submit" }));
    await user.click(screen.getByRole("button", { name: "submit" }));

    expect(screen.getByTestId("status")).toHaveTextContent("pending");

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(screen.getByTestId("status")).toHaveTextContent("success");
    expect(screen.getByLabelText("request")).toHaveValue("");
    expect(screen.getByTestId("request-count")).toHaveTextContent("3");

    vi.useRealTimers();
  });

  it("returns success status to idle when the user starts a new draft", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness />);

    await user.type(screen.getByLabelText("request"), "칭찬이 필요한 하루였어요.");
    await user.click(screen.getByRole("button", { name: "submit" }));

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    await user.type(screen.getByLabelText("request"), "다시 쓰기");

    expect(screen.getByTestId("status")).toHaveTextContent("idle");

    vi.useRealTimers();
  });
});
```

- [x] **Step 2: Run tests and verify RED**

Run: `pnpm test app/today/prototype/useOnseolPrototype.test.tsx`

Expected: FAIL because `requestSubmitStatus` does not exist and `submitRequest` is synchronous.

- [x] **Step 3: Implement lifecycle state** — 이후 `/read`, `/answer` 연동 과정에서 `useOnseolPrototype.ts` 자체가 사라지고, 이 lifecycle은 실제 API를 호출하는 `useTodayComposer.ts`(`requestSubmitStatus`, `submitRequest`)로 이관됨. 동작은 존재하지만 원래 계획한 파일에는 없음.

In `app/today/prototype/useOnseolPrototype.ts`:

```ts
type RequestSubmitStatus = "idle" | "pending" | "success";

export const REQUEST_SUBMIT_PENDING_MS = 450;
```

Update `UseOnseolPrototypeResult`:

```ts
requestSubmitStatus: RequestSubmitStatus;
submitRequest(): Promise<void>;
```

Inside the hook:

```ts
const [requestSubmitStatus, setRequestSubmitStatus] =
  useState<RequestSubmitStatus>("idle");
```

Update `updateRequestDraft`:

```ts
function updateRequestDraft(value: string): void {
  if (requestSubmitStatus === "success") {
    setRequestSubmitStatus("idle");
  }
  updateState((current) => ({ ...current, requestDraft: value }));
}
```

Replace `submitRequest` with:

```ts
async function submitRequest(): Promise<void> {
  if (requestSubmitStatus === "pending") return;

  const body = state.requestDraft.trim();
  if (!body) return;

  setRequestSubmitStatus("pending");

  await new Promise((resolve) =>
    window.setTimeout(resolve, REQUEST_SUBMIT_PENDING_MS),
  );

  const request: OnseolRequest = {
    id: createRequestId(),
    body,
    createdAt: new Date().toISOString(),
    authorId: state.viewer.id,
    replyIds: [],
    reportCount: 0,
    hidden: false,
  };

  updateState((current) => ({
    ...current,
    requests: [request, ...current.requests],
    requestDraft: "",
    selectedRequestId: current.selectedRequestId,
  }));
  setRequestSubmitStatus("success");
}
```

Return `requestSubmitStatus`.

- [x] **Step 4: Run hook tests and fix async edge cases**

Run: `pnpm test app/today/prototype/useOnseolPrototype.test.tsx`

Expected: PASS.

If the duplicate guard test creates more than one request, move the guard into a `useRef`:

```ts
const requestSubmittingRef = useRef(false);
```

Set `requestSubmittingRef.current = true` before the delay and `false` after success.

- [x] **Step 5: Run all tests**

Run: `pnpm test`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add app/today/prototype/useOnseolPrototype.ts app/today/prototype/useOnseolPrototype.test.tsx
git commit -m "test: cover today submit lifecycle"
```

---

### Task 3: Compact Composer Component

**Files:**
- Modify: `app/today/components/RequestComposer.tsx`
- Modify: `app/today/components/RequestComposer.test.tsx`

**Interfaces:**
- Consumes:
  - `value: string`
  - `status: "idle" | "pending" | "success"`
  - `onChange(value: string): void`
  - `onSubmit(): void | Promise<void>`
- Produces:
  - Textarea with accessible name `오늘 어떤 말을 듣고 싶나요?`
  - Submit button text:
    - idle/success: `보내기`
    - pending: `남기는 중`
  - Success message: `남겨졌어요`
  - Disabled submit when empty or pending

- [x] **Step 1: Replace composer tests with compact behavior tests**

Update `app/today/components/RequestComposer.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RequestComposer } from "./RequestComposer";

describe("RequestComposer", () => {
  it("disables send when the request body is empty", () => {
    render(
      <RequestComposer
        status="idle"
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "보내기" })).toBeDisabled();
  });

  it("submits through the send button when the request has text", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <RequestComposer
        status="idle"
        value="오늘은 조금 지쳤어요."
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "보내기" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows pending and success states", () => {
    const { rerender } = render(
      <RequestComposer
        status="pending"
        value="오늘은 조금 지쳤어요."
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "남기는 중" })).toBeDisabled();

    rerender(
      <RequestComposer
        status="success"
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("남겨졌어요")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run tests and verify RED**

Run: `pnpm test app/today/components/RequestComposer.test.tsx`

Expected: FAIL because `status` prop and `보내기` copy do not exist.

- [x] **Step 3: Implement compact composer** — 현재 구현은 성공 시 컴포저 내부에 `남겨졌어요` 문구를 넣지 않음. 대신 `TodayPrototype.tsx`가 하단 토스트로 `온설을 남겼어요`(성공)/에러 메시지를 보여주는 방식으로 바뀜.

Update `RequestComposerProps`:

```ts
type RequestComposerProps = {
  value: string;
  status: "idle" | "pending" | "success";
  onChange(value: string): void;
  onSubmit(): void | Promise<void>;
};
```

Use this structure:

```tsx
const isPending = status === "pending";
const canSubmit = Boolean(value.trim()) && !isPending;

return (
  <form
    className="mx-auto w-full max-w-2xl"
    onSubmit={(event) => {
      event.preventDefault();
      if (canSubmit) void onSubmit();
    }}
  >
    <label className="sr-only" htmlFor="request-body">
      오늘 어떤 말을 듣고 싶나요?
    </label>
    <div className="flex items-end gap-2 rounded-lg border border-line bg-surface px-3 py-2 focus-within:border-primary">
      <textarea
        className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2 text-base leading-6 text-foreground outline-none placeholder:text-muted"
        disabled={isPending}
        id="request-body"
        maxLength={160}
        placeholder="오늘 어떤 말을 듣고 싶나요?"
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canSubmit}
        type="submit"
      >
        {isPending ? "남기는 중" : "보내기"}
      </button>
    </div>
    {status === "success" ? (
      <p className="mt-3 text-center text-sm text-muted">남겨졌어요</p>
    ) : null}
  </form>
);
```

Use CSS `max-h-32` to cap at about 3-4 lines. Do not add an image button.

- [x] **Step 4: Run composer tests**

Run: `pnpm test app/today/components/RequestComposer.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add app/today/components/RequestComposer.tsx app/today/components/RequestComposer.test.tsx
git commit -m "test: cover compact today composer"
```

---

### Task 4: Rotating Onseol Line

**Files:**
- Add: `app/today/components/RotatingOnseolLine.tsx`
- Add: `app/today/components/RotatingOnseolLine.test.tsx`

**Interfaces:**
- Consumes:
  - `messages: string[]`
  - `paused: boolean`
  - optional `intervalMs?: number`
  - optional `transitionMs?: number`
- Produces:
  - Renders the current message as text.
  - Advances after `intervalMs` only when `paused` is false.
  - Uses soft vertical wipe CSS classes for default motion.
  - Uses CSS media query `@media (prefers-reduced-motion: reduce)` to suppress wipe.

- [x] **Step 1: Add failing rotation tests**

Create `app/today/components/RotatingOnseolLine.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RotatingOnseolLine } from "./RotatingOnseolLine";

describe("RotatingOnseolLine", () => {
  it("renders the first message", () => {
    render(
      <RotatingOnseolLine
        messages={["별일 아닌데 마음이 좀 가라앉았어요.", "오늘 실수한 일이 계속 떠올라요."]}
        paused={false}
      />,
    );

    expect(screen.getByText("별일 아닌데 마음이 좀 가라앉았어요.")).toBeInTheDocument();
  });

  it("advances messages after the interval", () => {
    vi.useFakeTimers();

    render(
      <RotatingOnseolLine
        intervalMs={5000}
        messages={["첫 번째 온설", "두 번째 온설"]}
        paused={false}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("두 번째 온설")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("does not advance while paused", () => {
    vi.useFakeTimers();

    render(
      <RotatingOnseolLine
        intervalMs={5000}
        messages={["첫 번째 온설", "두 번째 온설"]}
        paused
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("첫 번째 온설")).toBeInTheDocument();

    vi.useRealTimers();
  });
});
```

- [x] **Step 2: Run tests and verify RED**

Run: `pnpm test app/today/components/RotatingOnseolLine.test.tsx`

Expected: FAIL because `RotatingOnseolLine` does not exist.

- [x] **Step 3: Implement component**

Create `app/today/components/RotatingOnseolLine.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_TRANSITION_MS = 600;

type RotatingOnseolLineProps = {
  messages: string[];
  paused: boolean;
  intervalMs?: number;
  transitionMs?: number;
};

export function RotatingOnseolLine({
  messages,
  paused,
  intervalMs = DEFAULT_INTERVAL_MS,
  transitionMs = DEFAULT_TRANSITION_MS,
}: RotatingOnseolLineProps) {
  const [index, setIndex] = useState(0);
  const message = messages[index] ?? "";

  useEffect(() => {
    if (paused || messages.length <= 1) return;

    const timerId = window.setTimeout(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, intervalMs);

    return () => window.clearTimeout(timerId);
  }, [index, intervalMs, messages.length, paused]);

  if (!message) return null;

  return (
    <p
      className="onseol-soft-wipe mx-auto min-h-8 max-w-2xl text-center text-base leading-7 text-muted sm:text-lg"
      style={{ ["--onseol-transition-ms" as string]: `${transitionMs}ms` }}
    >
      {message}
    </p>
  );
}
```

Add CSS to `app/globals.css`:

```css
@keyframes onseol-soft-wipe {
  from {
    clip-path: inset(0 0 100% 0);
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    clip-path: inset(0 0 0 0);
    opacity: 1;
    transform: translateY(0);
  }
}

.onseol-soft-wipe {
  animation: onseol-soft-wipe var(--onseol-transition-ms, 600ms)
    cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .onseol-soft-wipe {
    animation: none;
  }
}
```

- [x] **Step 4: Run rotation tests**

Run: `pnpm test app/today/components/RotatingOnseolLine.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add app/today/components/RotatingOnseolLine.tsx app/today/components/RotatingOnseolLine.test.tsx app/globals.css
git commit -m "test: cover rotating onseol line"
```

---

### Task 5: Focused `/today` Screen Assembly

**Files:**
- Modify: `app/today/TodayPrototype.tsx`
- Modify: `app/today/prototype/useOnseolPrototype.ts`
- Add or modify: `app/today/TodayPrototype.test.tsx`
- Add: `docs/work-logs/2026-08-17-today-redesign-implementation.md`

**Interfaces:**
- Consumes:
  - `getTodayEntryMessages`
  - `RotatingOnseolLine`
  - `RequestComposer`
  - `prototype.requestSubmitStatus`
  - `prototype.submitRequest(): Promise<void>`
- Produces:
  - `/today` shows one focused entry surface.
  - Does not render current dashboard section headings: `답변을 기다리는 말`, `선택한 요청`, `최근 온설`, `내 활동`.
  - Shows activity sentence using local state counts.

- [x] **Step 1: Add failing screen tests**

Create `app/today/TodayPrototype.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TodayPrototype } from "./TodayPrototype";

describe("TodayPrototype", () => {
  it("renders the focused today entry screen", () => {
    render(<TodayPrototype />);

    expect(
      screen.getByRole("heading", { name: "오늘 어떤 말을 듣고 싶나요?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "보내기" })).toBeInTheDocument();
  });

  it("does not render the old all-in-one dashboard sections", () => {
    render(<TodayPrototype />);

    expect(screen.queryByText("답변을 기다리는 말")).not.toBeInTheDocument();
    expect(screen.queryByText("선택한 요청")).not.toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run screen tests and verify RED**

Run: `pnpm test app/today/TodayPrototype.test.tsx`

Expected: FAIL because old dashboard sections still render and heading may not match.

- [x] **Step 3: Expose rotating message data from the hook**

In `app/today/prototype/useOnseolPrototype.ts`, import `getTodayEntryMessages` and add fallback copy near the top of the file:

```ts
const FALLBACK_ONSEOL_MESSAGES = [
  "오늘 실수한 일이 계속 떠올라요.",
  "별일 아닌데 마음이 좀 가라앉았어요.",
  "끝내긴 했는데 잘한 건지 모르겠어요.",
  "그냥 오늘 하루 버틴 걸 알아줬으면 해요.",
];
```

Extend result type:

```ts
todayEntryMessages: string[];
```

Inside the hook:

```ts
const todayEntryMessages = getTodayEntryMessages(
  state,
  FALLBACK_ONSEOL_MESSAGES,
);
```

Return `todayEntryMessages`.

- [x] **Step 4: Assemble focused `/today` screen**

Replace `TodayPrototype` render with a focused layout:

```tsx
"use client";

import { RequestComposer } from "./components/RequestComposer";
import { RotatingOnseolLine } from "./components/RotatingOnseolLine";
import { useOnseolPrototype } from "./prototype/useOnseolPrototype";

export function TodayPrototype() {
  const prototype = useOnseolPrototype();
  const isTyping = prototype.state.requestDraft.trim().length > 0;
  const requestCount = prototype.state.requests.filter(
    (request) => !request.hidden,
  ).length;
  const replyCount = prototype.state.replies.filter((reply) => !reply.hidden).length;

  return (
    <main className="flex min-h-screen items-center bg-background px-5 py-10 text-foreground sm:px-8">
      <section className="mx-auto grid w-full max-w-3xl gap-8 text-center">
        <div className="space-y-4">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-4xl">
            오늘 어떤 말을 듣고 싶나요?
          </h1>
          <RotatingOnseolLine
            messages={prototype.todayEntryMessages}
            paused={isTyping}
          />
        </div>

        <RequestComposer
          status={prototype.requestSubmitStatus}
          value={prototype.state.requestDraft}
          onChange={prototype.updateRequestDraft}
          onSubmit={prototype.submitRequest}
        />

        <p className="text-sm text-muted">
          오늘 {requestCount}개의 이야기가 남겨졌고, {replyCount}개의 답장이 도착했어요.
        </p>
      </section>
    </main>
  );
}
```

Keep wording if exact copy changes are needed for layout. Do not add answer helper link. Do not add image button.

- [x] **Step 5: Add implementation work log**

Create `docs/work-logs/2026-08-17-today-redesign-implementation.md`:

```md
# `/today` 재설계 구현 기록

## 구현 범위

`/today`를 기존 all-in-one 프로토타입 화면에서 기본 문구, 순환 온설 문구, 입력창, 제출 상태 중심 화면으로 바꿨다.

## 유지한 결정

- 순환 온설은 최근 온설 캐시를 우선 사용하고, 없으면 기본 샘플을 보여준다.
- 내가 방금 작성한 온설은 순환 온설에 즉시 넣지 않는다.
- 제출은 pending, 성공, `남겨졌어요`, 입력창 비움 lifecycle을 보여준다.
- 초기 화면에는 `누군가에게 답하기` 보조 링크와 이미지 버튼을 넣지 않는다.

## 검증

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
```

- [x] **Step 6: Run focused screen tests**

Run: `pnpm test app/today/TodayPrototype.test.tsx`

Expected: PASS.

- [x] **Step 7: Run full verification**

Run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Expected:

- `pnpm test`: all test files pass.
- `pnpm lint`: no ESLint errors.
- `pnpm typecheck`: no TypeScript errors.
- `pnpm build`: build succeeds. If it fails only on Google Fonts network access, rerun with network allowed and record that detail in the PR.

- [x] **Step 8: Commit**

```bash
git add app/today/TodayPrototype.tsx app/today/TodayPrototype.test.tsx app/today/prototype/useOnseolPrototype.ts docs/work-logs/2026-08-17-today-redesign-implementation.md
git commit -m "feat: redesign today entry screen"
```

---

## Final PR Checklist

- [x] `/today` no longer shows the old all-in-one dashboard sections.
- [x] `/today` first viewport stays focused on basic prompt, rotating Onseol, composer, status, and small activity sentence.
- [x] Rotating Onseol uses non-viewer recent cached requests before fallback samples.
- [x] Viewer-authored submitted request does not appear immediately in rotating Onseol.
- [x] Submit pending state disables duplicate submit.
- [x] Submit success shows `남겨졌어요`, clears input, and does not navigate. — 실제로는 하단 토스트 `온설을 남겼어요`로 문구가 바뀜(의도는 동일). input은 비워짐, `/today`에 머무름.
- [x] Composer uses textarea and stays visually compact.
- [x] No `누군가에게 답하기` helper link is added near composer.
- [x] No image upload button is shown.
- [x] Soft vertical wipe has reduced-motion fallback.
- [x] Work log records decisions and verification.

## Verification Commands

Run before opening the implementation PR:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## Self-Review Notes

- Spec coverage: the plan covers rotating Onseol data, fallback, viewer exclusion, soft vertical wipe, reduced motion, typing pause, compact textarea, submit lifecycle, and old dashboard removal.
- Out of scope: `/answer`, `/read`, `/me`, Storybook, real backend, auth, AI filter, image upload.
- Test strategy: each behavior-changing task starts with a failing Vitest/RTL test and ends with a focused passing command before commit.
