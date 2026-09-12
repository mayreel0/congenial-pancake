import { act, fireEvent, render, screen, waitFor, within } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HeldRequestDto, RequestDto } from "../lib/requests/api";
import type { MyAnswerLogEntryDto } from "../lib/replies/api";
import { MockIntersectionObserver } from "../../vitest.setup";
import { AnswerSession } from "./AnswerSession";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

// A tiny in-memory stand-in for the real backend (already verified against
// the real one via curl for PR #67) — lets these tests exercise the actual
// skip/hold/reply state transitions instead of static canned responses.
function installFakeBackend(initialQueue: RequestDto[]) {
  let queue = [...initialQueue];
  let held: HeldRequestDto[] = [];
  let log: MyAnswerLogEntryDto[] = [];
  let replyCounter = 0;

  function nextCandidate(): RequestDto | null {
    return queue[0] ?? null;
  }

  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";

      if (url.endsWith("/auth/me")) {
        return Promise.resolve(
          jsonResponse(200, {
            id: "user-1",
            email: "member@example.com",
            createdAt: "2026-08-22T00:00:00.000Z",
          }),
        );
      }
      if (url.endsWith("/requests/queue") && method === "GET") {
        return Promise.resolve(jsonResponse(200, nextCandidate()));
      }
      if (url.endsWith("/requests/held") && method === "GET") {
        return Promise.resolve(jsonResponse(200, held));
      }
      if (url.includes("/replies/mine") && method === "GET") {
        return Promise.resolve(
          jsonResponse(200, {
            items: log,
            page: 1,
            pageSize: 20,
            totalItems: log.length,
            totalPages: 1,
          }),
        );
      }

      const skipMatch = /\/requests\/([^/]+)\/skip$/.exec(url);
      if (skipMatch && method === "POST") {
        const id = skipMatch[1];
        queue = queue.filter((request) => request.id !== id);
        held = held.filter((request) => request.id !== id);
        return Promise.resolve(jsonResponse(200, nextCandidate()));
      }

      const holdMatch = /\/requests\/([^/]+)\/hold$/.exec(url);
      if (holdMatch && method === "POST") {
        const id = holdMatch[1];
        const target = queue.find((request) => request.id === id);
        if (target) {
          // Mirrors the real backend's default queueFreshnessHours (60).
          const expiresAt = new Date(
            new Date(target.createdAt).getTime() + 60 * 60 * 60 * 1000,
          ).toISOString();
          held = [...held, { ...target, expiresAt }];
        }
        queue = queue.filter((request) => request.id !== id);
        return Promise.resolve(jsonResponse(200, nextCandidate()));
      }

      const replyMatch = /\/requests\/([^/]+)\/replies$/.exec(url);
      if (replyMatch && method === "POST") {
        const id = replyMatch[1];
        const target =
          queue.find((request) => request.id === id) ??
          held.find((request) => request.id === id);
        queue = queue.filter((request) => request.id !== id);
        held = held.filter((request) => request.id !== id);
        replyCounter += 1;
        const body = JSON.parse(init?.body as string) as { body: string };
        if (target) {
          log = [
            ...log,
            {
              requestId: target.id,
              requestBody: target.body,
              requestCreatedAt: target.createdAt,
              requestAuthor: target.author,
              requestRemoved: false,
              replyId: `reply-${replyCounter}`,
              replyBody: body.body,
              replyCreatedAt: new Date().toISOString(),
              replyAuthor: { anonymous: true },
              replyRemoved: false,
            },
          ];
        }
        return Promise.resolve(
          jsonResponse(201, {
            id: `reply-${replyCounter}`,
            requestId: id,
            body: body.body,
            createdAt: new Date().toISOString(),
          }),
        );
      }

      if (url.endsWith("/reports") && method === "POST") {
        const body = JSON.parse(init?.body as string) as { targetId: string };
        queue = queue.filter((request) => request.id !== body.targetId);
        return Promise.resolve(jsonResponse(204, undefined));
      }

      throw new Error(`Unmocked fetch: ${method} ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function makeRequest(overrides: Partial<RequestDto>): RequestDto {
  return {
    id: "request",
    body: "요청 본문",
    createdAt: new Date().toISOString(),
    replyCount: 0,
    author: { anonymous: true },
    ...overrides,
  };
}

describe("AnswerSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the current queue candidate", async () => {
    installFakeBackend([
      makeRequest({ id: "req-1", body: "오늘 실수한 일이 계속 떠올라요." }),
      makeRequest({ id: "req-2", body: "끝내긴 했는데 잘한 건지 모르겠어요." }),
    ]);

    render(<AnswerSession />);

    expect(
      await screen.findByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();
  });

  it("shows a skeleton, not the empty-queue message, while the queue candidate is loading", async () => {
    const fetchMock = installFakeBackend([]);
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
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
      if (url.endsWith("/requests/held")) {
        return Promise.resolve(jsonResponse(200, []));
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
      // /requests/queue never resolves — holds it in isLoading.
      if (url.endsWith("/requests/queue")) return new Promise(() => {});
      throw new Error(`Unmocked fetch: ${url}`);
    });

    const { container } = render(<AnswerSession />);

    await screen.findByPlaceholderText(
      "그 마음이 오래 남을 수 있죠. 그래도 오늘 버틴 건 분명해요.",
    );
    expect(
      screen.queryByText("지금은 답할 수 있는 온설이 없어요."),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows a skeleton in the toggle's spot while auth (and so the nickname) is still loading", async () => {
    const fetchMock = installFakeBackend([]);
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/requests/queue")) {
        return Promise.resolve(jsonResponse(200, null));
      }
      if (url.endsWith("/requests/held")) {
        return Promise.resolve(jsonResponse(200, []));
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
      // /auth/me never resolves — holds status in "loading".
      if (url.endsWith("/auth/me")) return new Promise(() => {});
      throw new Error(`Unmocked fetch: ${url}`);
    });

    const { container } = render(<AnswerSession />);

    await screen.findByPlaceholderText(
      "그 마음이 오래 남을 수 있죠. 그래도 오늘 버틴 건 분명해요.",
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("shows a skeleton, not '보류 중 (0)', while held requests are loading", async () => {
    const fetchMock = installFakeBackend([]);
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
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
      if (url.endsWith("/requests/queue")) {
        return Promise.resolve(jsonResponse(200, null));
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
      // /requests/held never resolves — holds it in isLoading.
      if (url.endsWith("/requests/held")) return new Promise(() => {});
      throw new Error(`Unmocked fetch: ${url}`);
    });

    const { container } = render(<AnswerSession />);

    await screen.findByPlaceholderText(
      "그 마음이 오래 남을 수 있죠. 그래도 오늘 버틴 건 분명해요.",
    );
    expect(
      screen.queryByRole("button", { name: /보류 중/ }),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows a typing indicator while the answer draft has text", async () => {
    installFakeBackend([makeRequest({ id: "req-1", body: "요청 본문" })]);

    render(<AnswerSession />);
    await screen.findByText("요청 본문");

    expect(screen.queryByText("입력 중")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("답변 남기기"), {
      target: { value: "짧게" },
    });

    expect(screen.getByText("입력 중")).toBeInTheDocument();
  });

  it("closes the more menu when clicking outside it", async () => {
    installFakeBackend([makeRequest({ id: "req-1", body: "요청 본문" })]);

    render(<AnswerSession />);
    await screen.findByText("요청 본문");

    fireEvent.click(await screen.findByRole("button", { name: "더보기" }));
    expect(screen.getByText("보류하기")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    // The menu stays mounted briefly to play its leave animation instead
    // of unmounting the instant it closes.
    await waitFor(() =>
      expect(screen.queryByText("보류하기")).not.toBeInTheDocument(),
    );
  });

  it("hides hold/report actions but keeps skip when not logged in", async () => {
    const fetchMock = installFakeBackend([
      makeRequest({ id: "req-1", body: "요청 본문" }),
    ]);
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/auth/me")) {
        return Promise.resolve(jsonResponse(401, { code: "UNAUTHORIZED" }));
      }
      if (url.endsWith("/requests/queue")) {
        return Promise.resolve(
          jsonResponse(200, makeRequest({ id: "req-1", body: "요청 본문" })),
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

    render(<AnswerSession />);
    await screen.findByText("요청 본문");

    expect(
      screen.queryByRole("button", { name: "더보기" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 글" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /보류 중/ }),
    ).not.toBeInTheDocument();
  });

  it("advances the queue after skip is confirmed", async () => {
    installFakeBackend([
      makeRequest({ id: "req-1", body: "오늘 실수한 일이 계속 떠올라요." }),
      makeRequest({ id: "req-2", body: "끝내긴 했는데 잘한 건지 모르겠어요." }),
    ]);
    render(<AnswerSession />);
    await screen.findByText("오늘 실수한 일이 계속 떠올라요.");

    fireEvent.click(screen.getByRole("button", { name: "다음 글" }));
    expect(
      screen.getByText(/넘기면 답하기 목록에서 다시 보이지 않습니다/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "넘기기" }));

    expect(
      await screen.findByText("끝내긴 했는데 잘한 건지 모르겠어요."),
    ).toBeInTheDocument();
  });

  it("does nothing when skip is cancelled", async () => {
    installFakeBackend([makeRequest({ id: "req-1", body: "요청 본문" })]);
    render(<AnswerSession />);
    await screen.findByText("요청 본문");

    fireEvent.click(screen.getByRole("button", { name: "다음 글" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.getByText("요청 본문")).toBeInTheDocument();
  });

  it("moves a held request into the hold panel and back out when answered", async () => {
    installFakeBackend([makeRequest({ id: "req-1", body: "요청 본문" })]);
    render(<AnswerSession />);
    await screen.findByText("요청 본문");

    fireEvent.click(await screen.findByRole("button", { name: "더보기" }));
    fireEvent.click(screen.getByRole("button", { name: "보류하기" }));
    // Scoped to the dialog — the more-menu item of the same name can still
    // be mid-leave-animation in the DOM at this exact point.
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "보류하기",
      }),
    );

    expect(
      await screen.findByRole("button", { name: "보류 중 (1)" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "보류 중 (1)" }));
    const panel = screen.getByLabelText("보류한 온설 목록");
    expect(within(panel).getByText("익명")).toBeInTheDocument();
    expect(within(panel).getByText("방금")).toBeInTheDocument();
    expect(within(panel).getByText(/후 만료$/)).toBeInTheDocument();
    fireEvent.click(within(panel).getByText("요청 본문"));

    fireEvent.change(screen.getByLabelText("답변 남기기"), {
      target: { value: "짧게 들었다는 말을 전해요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "답변하기" }));

    expect(
      await screen.findByRole("button", { name: "보류 중 (0)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("짧게 들었다는 말을 전해요.")).toBeInTheDocument();
  });

  it("requires confirmation before a report takes effect", async () => {
    installFakeBackend([
      makeRequest({ id: "req-1", body: "오늘 실수한 일이 계속 떠올라요." }),
      makeRequest({ id: "req-2", body: "끝내긴 했는데 잘한 건지 모르겠어요." }),
    ]);
    render(<AnswerSession />);
    await screen.findByText("오늘 실수한 일이 계속 떠올라요.");

    fireEvent.click(await screen.findByRole("button", { name: "더보기" }));
    fireEvent.click(screen.getByRole("button", { name: "신고하기" }));
    expect(
      screen.getByText(/신고하면 이 글은 답하기 목록에서 사라집니다/),
    ).toBeInTheDocument();

    // Scoped to the dialog — the more-menu item of the same name can still
    // be mid-leave-animation in the DOM at this exact point.
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "취소",
      }),
    );
    expect(
      screen.getByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "더보기" }));
    fireEvent.click(screen.getByRole("button", { name: "신고하기" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "신고하기",
      }),
    );

    await act(async () => {});

    expect(
      await screen.findByText("끝내긴 했는데 잘한 건지 모르겠어요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("오늘 실수한 일이 계속 떠올라요."),
    ).not.toBeInTheDocument();
  });

  it("loads an older page of the answer log when the top sentinel scrolls into view", async () => {
    const recentEntry: MyAnswerLogEntryDto = {
      requestId: "req-recent",
      requestBody: "최근에 남긴 고민",
      requestCreatedAt: "2026-08-25T00:00:00.000Z",
      requestAuthor: { anonymous: true },
      requestRemoved: false,
      replyId: "reply-recent",
      replyBody: "최근에 남긴 답변",
      replyCreatedAt: "2026-08-25T01:00:00.000Z",
      replyAuthor: { anonymous: true },
      replyRemoved: false,
    };
    const olderEntry: MyAnswerLogEntryDto = {
      requestId: "req-older",
      requestBody: "예전에 남긴 고민",
      requestCreatedAt: "2026-08-01T00:00:00.000Z",
      requestAuthor: { anonymous: true },
      requestRemoved: false,
      replyId: "reply-older",
      replyBody: "예전에 남긴 답변",
      replyCreatedAt: "2026-08-01T01:00:00.000Z",
      replyAuthor: { anonymous: true },
      replyRemoved: false,
    };

    let resolveOlderPage: (() => void) | null = null;
    const olderPagePromise = new Promise<void>((resolve) => {
      resolveOlderPage = resolve;
    });

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
      if (url.endsWith("/requests/queue")) {
        return Promise.resolve(jsonResponse(200, null));
      }
      if (url.endsWith("/requests/held")) {
        return Promise.resolve(jsonResponse(200, []));
      }
      if (url.includes("/replies/mine")) {
        const page = Number(new URL(url).searchParams.get("page") ?? "1");
        if (page > 1) {
          // Held pending until the test explicitly resolves it, so the
          // skeleton-while-loading-older state can be asserted first.
          return olderPagePromise.then(() =>
            jsonResponse(200, {
              items: [olderEntry],
              page,
              pageSize: 1,
              totalItems: 2,
              totalPages: 2,
            }),
          );
        }
        return Promise.resolve(
          jsonResponse(200, {
            items: [recentEntry],
            page,
            pageSize: 1,
            totalItems: 2,
            totalPages: 2,
          }),
        );
      }
      throw new Error(`Unmocked fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<AnswerSession />);

    expect(await screen.findByText("최근에 남긴 고민")).toBeInTheDocument();
    expect(screen.queryByText("예전에 남긴 고민")).not.toBeInTheDocument();

    // The sentinel only mounts once isLoadingAnswerLog itself flips false,
    // which — via useMinDisplayDuration — lags data arrival by one tick
    // (a real setTimeout, even at 0ms, to avoid a synchronous setState
    // inside an effect) — entries can render slightly before that.
    await waitFor(() =>
      expect(MockIntersectionObserver.instances.length).toBeGreaterThan(0),
    );
    const observer = MockIntersectionObserver.instances.at(-1);
    expect(observer).toBeDefined();
    await act(async () => {
      observer!.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        observer! as unknown as IntersectionObserver,
      );
    });

    // Still mid-flight (the older page hasn't resolved yet) — a skeleton
    // bubble pair should show above the sentinel instead of nothing.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText("예전에 남긴 고민")).not.toBeInTheDocument();

    resolveOlderPage!();

    expect(await screen.findByText("예전에 남긴 고민")).toBeInTheDocument();
    // Both loaded pages stay visible — older is prepended, not swapped in.
    expect(screen.getByText("최근에 남긴 고민")).toBeInTheDocument();
  });
});
