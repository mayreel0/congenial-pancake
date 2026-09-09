import { fireEvent, render, screen, waitFor, within } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecordsPage from "./page";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function installFakeBackend({
  loggedIn,
  replies = [],
  requestLog = [],
}: {
  loggedIn: boolean;
  replies?: unknown[];
  requestLog?: unknown[];
}) {
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

      if (url.includes("/delete-own") && method === "POST") {
        return Promise.resolve(jsonResponse(204, null));
      }

      if (url.includes("/replies/mine")) {
        return Promise.resolve(
          jsonResponse(200, {
            items: replies,
            page: 1,
            pageSize: 20,
            totalItems: replies.length,
            totalPages: 1,
          }),
        );
      }

      if (url.includes("/requests/mine")) {
        return Promise.resolve(
          jsonResponse(200, {
            items: requestLog,
            page: 1,
            pageSize: 20,
            totalItems: requestLog.length,
            totalPages: 1,
          }),
        );
      }

      throw new Error(`Unmocked fetch: ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function switchToRepliesTab() {
  fireEvent.click(await screen.findByRole("tab", { name: "내가 남긴 답변" }));
}

describe("RecordsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows the login prompt to anonymous visitors", async () => {
    installFakeBackend({ loggedIn: false });

    render(<RecordsPage />);

    expect(
      await screen.findByText("로그인하면 내 기록을 볼 수 있습니다."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "로그인" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "http://localhost:3000/login" }),
      ]),
    );
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("defaults to the 내가 남긴 고민 tab", async () => {
    installFakeBackend({ loggedIn: true });

    render(<RecordsPage />);

    expect(
      await screen.findByRole("tab", { name: "내가 남긴 고민", selected: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "내가 남긴 답변", selected: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "내가 남긴 고민" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "내가 남긴 답변" }),
    ).not.toBeInTheDocument();
  });

  it("shows an answer CTA when the member has not replied yet", async () => {
    installFakeBackend({ loggedIn: true });

    render(<RecordsPage />);
    await switchToRepliesTab();

    expect(
      await screen.findByRole("heading", { name: "내가 남긴 답변" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("아직 남긴 답변이 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "답변 남기러 가기" })).toHaveAttribute(
      "href",
      "/answer",
    );
  });

  it("shows a request CTA when the member has not posted a concern yet", async () => {
    installFakeBackend({ loggedIn: true });

    render(<RecordsPage />);

    expect(
      await screen.findByRole("heading", { name: "내가 남긴 고민" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("아직 남긴 고민이 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "고민 남기러 가기" })).toHaveAttribute(
      "href",
      "/today",
    );
  });

  it("renders the member's answer log with request and reply timestamps", async () => {
    installFakeBackend({
      loggedIn: true,
      replies: [
        {
          requestId: "request-1",
          requestBody: "요즘 마음이 자꾸 가라앉아요.",
          requestCreatedAt: "2026-08-20T10:15:00.000Z",
          replyId: "reply-1",
          replyBody: "잠깐이라도 쉬어가도 괜찮다고 말해주고 싶어요.",
          replyCreatedAt: "2026-08-21T11:30:00.000Z",
        },
      ],
    });

    render(<RecordsPage />);
    await switchToRepliesTab();

    expect(await screen.findByText("요즘 마음이 자꾸 가라앉아요.")).toBeInTheDocument();
    expect(
      screen.getByText("잠깐이라도 쉬어가도 괜찮다고 말해주고 싶어요."),
    ).toBeInTheDocument();
    expect(screen.getByText("8월 20일 19:15")).toBeInTheDocument();
    expect(screen.getByText("8월 21일 20:30")).toBeInTheDocument();
  });

  it("renders the member's own requests with received replies", async () => {
    installFakeBackend({
      loggedIn: true,
      requestLog: [
        {
          request: {
            id: "request-1",
            body: "요즘 마음이 자꾸 가라앉아요.",
            createdAt: "2026-08-20T10:15:00.000Z",
            author: { anonymous: true },
          },
          replies: [
            {
              id: "reply-1",
              body: "잠깐이라도 쉬어가도 괜찮다고 말해주고 싶어요.",
              createdAt: "2026-08-21T11:30:00.000Z",
              author: {
                anonymous: false,
                nickname: "햇살",
                nicknameDiscriminator: "AB12",
              },
            },
          ],
        },
      ],
    });

    render(<RecordsPage />);

    expect(await screen.findByText("요즘 마음이 자꾸 가라앉아요.")).toBeInTheDocument();
    expect(
      screen.getByText("잠깐이라도 쉬어가도 괜찮다고 말해주고 싶어요."),
    ).toBeInTheDocument();
    expect(screen.getByText("햇살#AB12")).toBeInTheDocument();
  });

  it("shows a placeholder when a posted request has no replies yet", async () => {
    installFakeBackend({
      loggedIn: true,
      requestLog: [
        {
          request: {
            id: "request-1",
            body: "요즘 마음이 자꾸 가라앉아요.",
            createdAt: "2026-08-20T10:15:00.000Z",
            author: { anonymous: true },
          },
          replies: [],
        },
      ],
    });

    render(<RecordsPage />);

    expect(await screen.findByText("요즘 마음이 자꾸 가라앉아요.")).toBeInTheDocument();
    expect(screen.getByText("아직 받은 답변이 없어요.")).toBeInTheDocument();
  });

  it("switching tabs shows one section's content at a time", async () => {
    installFakeBackend({
      loggedIn: true,
      requestLog: [
        {
          request: {
            id: "request-1",
            body: "요즘 마음이 자꾸 가라앉아요.",
            createdAt: "2026-08-20T10:15:00.000Z",
            author: { anonymous: true },
          },
          replies: [],
        },
      ],
      replies: [
        {
          requestId: "request-2",
          requestBody: "오늘도 무사히 지나갔어요.",
          requestCreatedAt: "2026-08-20T10:15:00.000Z",
          replyId: "reply-1",
          replyBody: "잘 하셨어요.",
          replyCreatedAt: "2026-08-21T11:30:00.000Z",
        },
      ],
    });

    render(<RecordsPage />);

    expect(await screen.findByText("요즘 마음이 자꾸 가라앉아요.")).toBeInTheDocument();
    expect(screen.queryByText("오늘도 무사히 지나갔어요.")).not.toBeInTheDocument();

    await switchToRepliesTab();

    expect(await screen.findByText("오늘도 무사히 지나갔어요.")).toBeInTheDocument();
    expect(
      screen.queryByText("요즘 마음이 자꾸 가라앉아요."),
    ).not.toBeInTheDocument();
  });

  it("filters 내가 남긴 고민 by date range (resetting to page 1) and paginates via 번호 페이지", async () => {
    // Fixed "now" so HeatmapCalendar's default month view is August 2026 —
    // otherwise it'd default to whichever real month the test happens to
    // run in, and the range clicked below wouldn't be visible without also
    // navigating months first.
    vi.setSystemTime(new Date("2026-08-15T00:00:00.000Z"));
    const requestedParams: URLSearchParams[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/auth/me")) {
        return Promise.resolve(
          jsonResponse(200, {
            id: "user-1",
            email: "member@example.com",
            createdAt: "2026-08-22T00:00:00.000Z",
          }),
        );
      }
      if (url.includes("/requests/mine")) {
        const params = new URL(url).searchParams;
        requestedParams.push(params);
        const page = Number(params.get("page") ?? "1");
        return Promise.resolve(
          jsonResponse(200, {
            items: [
              {
                request: {
                  id: `request-page-${page}`,
                  body: `페이지 ${page}의 고민`,
                  createdAt: "2026-08-21T00:00:00.000Z",
                  author: { anonymous: true },
                },
                replies: [],
              },
            ],
            page,
            pageSize: 20,
            totalItems: 40,
            totalPages: 2,
          }),
        );
      }
      if (url.includes("/replies/mine")) {
        return Promise.resolve(
          jsonResponse(200, {
            items: [],
            page: 1,
            pageSize: 20,
            totalItems: 0,
            totalPages: 1,
          }),
        );
      }
      throw new Error(`Unmocked fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RecordsPage />);

    expect(await screen.findByText("페이지 1의 고민")).toBeInTheDocument();

    // 시작일/종료일 are two independent fields, each with its own popover
    // — open one, pick a day (closes it), then the other.
    fireEvent.click(screen.getByRole("button", { name: "시작일" }));
    fireEvent.click(
      screen.getByRole("button", { name: /^2026-08-01 / }),
    );
    fireEvent.click(screen.getByRole("button", { name: "종료일" }));
    fireEvent.click(
      screen.getByRole("button", { name: /^2026-08-31 / }),
    );

    await screen.findByText("페이지 1의 고민");
    const rangeCall = requestedParams.at(-1);
    expect(rangeCall?.get("from")).toBe("2026-08-01");
    expect(rangeCall?.get("to")).toBe("2026-08-31");
    // Changing the range resets to page 1 — no stale page carried over.
    expect(rangeCall?.get("page")).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(await screen.findByText("페이지 2의 고민")).toBeInTheDocument();
    const pageCall = requestedParams.at(-1);
    expect(pageCall?.get("page")).toBe("2");
    // The date range set above should still apply on page 2.
    expect(pageCall?.get("from")).toBe("2026-08-01");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "50" } });

    await waitFor(() => {
      const sizeCall = requestedParams.at(-1)!;
      expect(sizeCall.get("pageSize")).toBe("50");
      // Changing the page size also resets to page 1.
      expect(sizeCall.get("page")).toBe("1");
    });
  });

  it("deletes a posted request after confirming, via 더보기 → 삭제하기", async () => {
    const fetchMock = installFakeBackend({
      loggedIn: true,
      requestLog: [
        {
          request: {
            id: "request-1",
            body: "요즘 마음이 자꾸 가라앉아요.",
            createdAt: "2026-08-20T10:15:00.000Z",
            author: { anonymous: true },
            removed: false,
          },
          replies: [],
        },
      ],
    });

    render(<RecordsPage />);

    await screen.findByText("요즘 마음이 자꾸 가라앉아요.");
    fireEvent.click(screen.getByRole("button", { name: "더보기" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제하기" }));

    expect(
      await screen.findByText(
        "이 글을 삭제할까요? 삭제하면 글 내용은 사라지고, 이미 달린 답변은 그대로 남아요.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "삭제하기" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/requests/request-1/delete-own"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("hides the 더보기 menu for an already-deleted request", async () => {
    installFakeBackend({
      loggedIn: true,
      requestLog: [
        {
          request: {
            id: "request-1",
            body: "삭제된 글이에요.",
            createdAt: "2026-08-20T10:15:00.000Z",
            author: { anonymous: true },
            removed: true,
          },
          replies: [],
        },
      ],
    });

    render(<RecordsPage />);

    await screen.findByText("삭제된 글이에요.");
    expect(
      screen.queryByRole("button", { name: "더보기" }),
    ).not.toBeInTheDocument();
  });

  it("deletes a given reply after confirming, via 더보기 → 삭제하기", async () => {
    const fetchMock = installFakeBackend({
      loggedIn: true,
      replies: [
        {
          requestId: "request-1",
          requestBody: "요즘 마음이 자꾸 가라앉아요.",
          requestCreatedAt: "2026-08-20T10:15:00.000Z",
          requestRemoved: false,
          replyId: "reply-1",
          replyBody: "잠깐이라도 쉬어가도 괜찮다고 말해주고 싶어요.",
          replyCreatedAt: "2026-08-21T11:30:00.000Z",
          replyRemoved: false,
        },
      ],
    });

    render(<RecordsPage />);
    await switchToRepliesTab();

    await screen.findByText("잠깐이라도 쉬어가도 괜찮다고 말해주고 싶어요.");
    fireEvent.click(screen.getByRole("button", { name: "더보기" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제하기" }));

    expect(
      await screen.findByText("이 답변을 삭제할까요? 삭제한 답변은 더 이상 보이지 않아요."),
    ).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "삭제하기" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/requests/request-1/replies/reply-1/delete-own"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("hides the 더보기 menu for an already-deleted reply", async () => {
    installFakeBackend({
      loggedIn: true,
      replies: [
        {
          requestId: "request-1",
          requestBody: "요즘 마음이 자꾸 가라앉아요.",
          requestCreatedAt: "2026-08-20T10:15:00.000Z",
          requestRemoved: false,
          replyId: "reply-1",
          replyBody: "삭제된 답변이에요.",
          replyCreatedAt: "2026-08-21T11:30:00.000Z",
          replyRemoved: true,
        },
      ],
    });

    render(<RecordsPage />);
    await switchToRepliesTab();

    await screen.findByText("삭제된 답변이에요.");
    expect(
      screen.queryByRole("button", { name: "더보기" }),
    ).not.toBeInTheDocument();
  });
});
