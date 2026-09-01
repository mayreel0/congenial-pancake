import { fireEvent, render, screen, waitFor, within } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatKoreanDate, yesterdayKstDateString } from "../lib/kst-date";
import type { FeedItemDto } from "../lib/requests/api";
import { ReadFeed } from "./ReadFeed";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function makeItem(overrides: Partial<FeedItemDto> = {}): FeedItemDto {
  return {
    request: {
      id: "req-1",
      body: "요청 본문",
      createdAt: new Date().toISOString(),
      replyCount: 1,
      authorSlot: 0,
      author: { anonymous: true },
    },
    replies: [
      {
        id: "reply-1",
        requestId: "req-1",
        body: "답변",
        createdAt: new Date().toISOString(),
        authorSlot: 1,
        author: { anonymous: true },
      },
    ],
    ...overrides,
  };
}

// A tiny in-memory stand-in for the real backend (already verified against
// the real one via curl for this round) — lets these tests exercise the
// actual save/unsave/report state transitions instead of static canned
// responses. Same pattern as answer/AnswerSession.test.tsx.
function installFakeBackend(initialFeed: FeedItemDto[], loggedIn = true) {
  let feed = [...initialFeed];
  let savedReplyIds: string[] = [];

  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";

      if (url.endsWith("/auth/me")) {
        if (!loggedIn) {
          return Promise.resolve(jsonResponse(401, { code: "UNAUTHORIZED" }));
        }
        return Promise.resolve(
          jsonResponse(200, {
            id: "user-1",
            email: "member@example.com",
            createdAt: "2026-08-22T00:00:00.000Z",
          }),
        );
      }
      if (url.includes("/requests/feed/counts") && method === "GET") {
        const params = new URL(url).searchParams;
        return Promise.resolve(
          jsonResponse(200, {
            from: params.get("from"),
            to: params.get("to"),
            days: [],
          }),
        );
      }
      if (url.includes("/requests/feed") && method === "GET") {
        const params = new URL(url).searchParams;
        const requestedDate = params.get("date");
        const requestedPageSize = Number(params.get("pageSize") ?? "10");
        return Promise.resolve(
          jsonResponse(200, {
            items: feed,
            page: 1,
            pageSize: requestedPageSize,
            totalItems: feed.length,
            totalPages: 1,
            date: requestedDate ?? yesterdayKstDateString(),
          }),
        );
      }
      if (url.endsWith("/replies/saved") && method === "GET") {
        return Promise.resolve(jsonResponse(200, savedReplyIds));
      }

      const saveMatch = /\/replies\/([^/]+)\/save$/.exec(url);
      if (saveMatch && method === "POST") {
        const id = saveMatch[1];
        if (!savedReplyIds.includes(id)) {
          savedReplyIds = [...savedReplyIds, id];
        }
        return Promise.resolve(jsonResponse(204, undefined));
      }
      if (saveMatch && method === "DELETE") {
        const id = saveMatch[1];
        savedReplyIds = savedReplyIds.filter((replyId) => replyId !== id);
        return Promise.resolve(jsonResponse(204, undefined));
      }

      if (url.endsWith("/reports") && method === "POST") {
        const body = JSON.parse(init?.body as string) as {
          targetType: "request" | "reply";
          targetId: string;
        };
        feed =
          body.targetType === "request"
            ? feed.filter((item) => item.request.id !== body.targetId)
            : feed
                .map((item) => ({
                  ...item,
                  replies: item.replies.filter(
                    (reply) => reply.id !== body.targetId,
                  ),
                }))
                .filter((item) => item.replies.length > 0);
        return Promise.resolve(jsonResponse(204, undefined));
      }

      throw new Error(`Unmocked fetch: ${method} ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ReadFeed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders every thread returned by the feed", async () => {
    installFakeBackend([
      makeItem({
        request: {
          id: "req-1",
          body: "첫 번째 요청",
          createdAt: new Date().toISOString(),
          replyCount: 1,
          authorSlot: 0,
          author: { anonymous: true },
        },
      }),
      makeItem({
        request: {
          id: "req-2",
          body: "두 번째 요청",
          createdAt: new Date().toISOString(),
          replyCount: 1,
          authorSlot: 0,
          author: { anonymous: true },
        },
        replies: [
          {
            id: "reply-2",
            requestId: "req-2",
            body: "두 번째 답변",
            createdAt: new Date().toISOString(),
            authorSlot: 1,
            author: { anonymous: true },
          },
        ],
      }),
    ]);

    render(<ReadFeed />);

    expect(await screen.findByText("첫 번째 요청")).toBeInTheDocument();
    expect(screen.getByText("두 번째 요청")).toBeInTheDocument();
  });

  it("toggles save instantly with no confirmation", async () => {
    installFakeBackend([makeItem()]);
    render(<ReadFeed />);
    await screen.findByText("요청 본문");

    fireEvent.click(
      await screen.findByRole("button", { name: "마음에 남기기" }),
    );

    expect(
      await screen.findByRole("button", { name: /마음에 남긴 답변/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles save per reply, independent of other replies on the same request", async () => {
    installFakeBackend([
      makeItem({
        replies: [
          {
            id: "reply-1",
            requestId: "req-1",
            body: "첫 번째 답변",
            createdAt: "2026-08-19T09:00:00.000Z",
            authorSlot: 1,
            author: { anonymous: true },
          },
          {
            id: "reply-2",
            requestId: "req-1",
            body: "두 번째 답변",
            createdAt: "2026-08-19T10:00:00.000Z",
            authorSlot: 2,
            author: { anonymous: true },
          },
        ],
      }),
    ]);

    render(<ReadFeed />);
    await screen.findByText("요청 본문");

    const [firstSaveButton, secondSaveButton] = await screen.findAllByRole(
      "button",
      { name: "마음에 남기기" },
    );

    fireEvent.click(firstSaveButton);

    await waitFor(() =>
      expect(firstSaveButton).toHaveAttribute("aria-pressed", "true"),
    );
    expect(secondSaveButton).toHaveAttribute("aria-pressed", "false");
  });

  it("requires confirmation before a report removes an item, and removes the whole card when the only reply is reported", async () => {
    installFakeBackend([makeItem()]);
    render(<ReadFeed />);
    await screen.findByText("요청 본문");

    const [, replyMoreButton] = screen.getAllByRole("button", {
      name: "더보기",
    });

    fireEvent.click(replyMoreButton);
    fireEvent.click(
      within(screen.getByLabelText("답변 도구")).getByRole("button", {
        name: "신고하기",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByText("요청 본문")).toBeInTheDocument();

    fireEvent.click(replyMoreButton);
    fireEvent.click(
      within(screen.getByLabelText("답변 도구")).getByRole("button", {
        name: "신고하기",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "신고하기" }));

    await waitFor(() =>
      expect(screen.queryByText("요청 본문")).not.toBeInTheDocument(),
    );
  });

  it("shows an empty state when nothing qualifies", async () => {
    installFakeBackend([]);
    render(<ReadFeed />);

    expect(
      await screen.findByText("이 날 읽을 수 있는 온설이 없어요."),
    ).toBeInTheDocument();
  });

  it("hides save/report actions when not logged in", async () => {
    installFakeBackend([makeItem()], false);
    render(<ReadFeed />);
    await screen.findByText("요청 본문");

    expect(
      screen.queryByRole("button", { name: "마음에 남기기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "더보기" }),
    ).not.toBeInTheDocument();
  });

  it("browses by KST day via the calendar: clicking an earlier day re-fetches it, and today's cell is disabled", async () => {
    // Fixed mid-month "now" so yesterday/day-before-yesterday/today all
    // fall in the same calendar month regardless of which real day this
    // test runs on (HeatmapCalendar is month-bounded, unlike the old
    // arrow-based DayNav which had no such constraint).
    vi.setSystemTime(new Date("2026-09-15T10:00:00.000Z")); // 2026-09-15 19:00 KST
    const yesterday = "2026-09-14";
    const dayBeforeYesterday = "2026-09-13";
    const today = "2026-09-15";

    const fetchMock = installFakeBackend([]);
    render(<ReadFeed />);

    // Defaults to yesterday (mocked by installFakeBackend).
    await screen.findByText(formatKoreanDate(yesterday));
    expect(
      screen.getByRole("button", { name: new RegExp(`^${today} `) }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`^${dayBeforeYesterday} `) }),
    );

    await screen.findByText(formatKoreanDate(dayBeforeYesterday));
    const feedCalls = fetchMock.mock.calls.filter(([input]) =>
      (typeof input === "string" ? input : input.toString()).includes(
        "/requests/feed?",
      ),
    );
    const lastFeedCall = feedCalls.at(-1);
    expect(lastFeedCall).toBeDefined();
    const [input] = lastFeedCall!;
    const requestedUrl = new URL(
      typeof input === "string" ? input : input.toString(),
    );
    expect(requestedUrl.searchParams.get("date")).toBe(dayBeforeYesterday);
  });

  it("shows the pagination control even with a single page, and changing page size resets to page 1", async () => {
    const fetchMock = installFakeBackend([]);
    render(<ReadFeed />);

    await screen.findByText(formatKoreanDate(yesterdayKstDateString()));
    // Only one page of results, but the size selector must stay reachable.
    expect(screen.getByRole("navigation", { name: "페이지" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "50" } });

    await waitFor(() => {
      const feedCalls = fetchMock.mock.calls.filter(([input]) =>
        (typeof input === "string" ? input : input.toString()).includes(
          "/requests/feed",
        ),
      );
      const lastCall = feedCalls.at(-1)!;
      const [input] = lastCall;
      const requestedUrl = new URL(
        typeof input === "string" ? input : input.toString(),
      );
      expect(requestedUrl.searchParams.get("pageSize")).toBe("50");
      expect(requestedUrl.searchParams.get("page")).toBe("1");
    });
  });
});
