import { act, fireEvent, render, screen, within } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RequestDto } from "../lib/requests/api";
import type { MyAnswerLogEntryDto } from "../lib/replies/api";
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
  let held: RequestDto[] = [];
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
      if (url.endsWith("/replies/mine") && method === "GET") {
        return Promise.resolve(jsonResponse(200, log));
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
        if (target) held = [...held, target];
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
              replyId: `reply-${replyCounter}`,
              replyBody: body.body,
              replyCreatedAt: new Date().toISOString(),
              replyAuthor: { anonymous: true },
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

    expect(screen.queryByText("보류하기")).not.toBeInTheDocument();
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
      if (url.endsWith("/replies/mine")) {
        return Promise.resolve(jsonResponse(200, []));
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
    fireEvent.click(screen.getByRole("button", { name: "보류하기" }));

    expect(
      await screen.findByRole("button", { name: "보류 중 (1)" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "보류 중 (1)" }));
    const panel = screen.getByLabelText("보류한 온설 목록");
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

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(
      screen.getByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "더보기" }));
    fireEvent.click(screen.getByRole("button", { name: "신고하기" }));
    fireEvent.click(screen.getByRole("button", { name: "신고하기" }));

    await act(async () => {});

    expect(
      await screen.findByText("끝내긴 했는데 잘한 건지 모르겠어요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("오늘 실수한 일이 계속 떠올라요."),
    ).not.toBeInTheDocument();
  });
});
