import { fireEvent, render, screen, waitFor, within } from "./lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HiddenModerationQueueDto } from "./lib/admin/api";
import { AdminReview } from "./AdminReview";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function makeQueue(
  overrides: Partial<HiddenModerationQueueDto> = {},
): HiddenModerationQueueDto {
  return {
    requests: [
      {
        id: "req-1",
        body: "숨겨진 요청",
        createdAt: "2026-08-25T00:00:00.000Z",
        reportCount: 3,
      },
    ],
    replies: [
      {
        id: "reply-1",
        requestId: "req-1",
        requestBody: "원글",
        body: "숨겨진 답변",
        createdAt: "2026-08-25T00:00:00.000Z",
        reportCount: 3,
      },
    ],
    ...overrides,
  };
}

// loggedIn starts as a mutable flag rather than a fixed option so the login
// test can flip it mid-test (log in, then have subsequent /auth/me calls
// reflect that) — same fake-backend pattern as
// apps/web's old admin test / read/ReadFeed.test.tsx.
function installFakeBackend(
  queue: HiddenModerationQueueDto,
  {
    loggedIn = true,
    isAdmin = true,
    loginSucceeds = true,
    neverResolveQueue = false,
    neverResolveAuth = false,
  }: {
    loggedIn?: boolean;
    isAdmin?: boolean;
    loginSucceeds?: boolean;
    neverResolveQueue?: boolean;
    neverResolveAuth?: boolean;
  } = {},
) {
  let currentlyLoggedIn = loggedIn;

  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";

      if (url.endsWith("/auth/me")) {
        if (neverResolveAuth) return new Promise(() => {});
        if (!currentlyLoggedIn) {
          return Promise.resolve(jsonResponse(401, { code: "UNAUTHORIZED" }));
        }
        return Promise.resolve(
          jsonResponse(200, {
            id: "user-1",
            email: "admin@example.com",
            createdAt: "2026-08-22T00:00:00.000Z",
          }),
        );
      }

      if (url.endsWith("/auth/login") && method === "POST") {
        if (!loginSucceeds) {
          return Promise.resolve(
            jsonResponse(401, {
              code: "AUTH_INVALID_CREDENTIALS",
              message: "이메일 또는 비밀번호가 올바르지 않습니다.",
            }),
          );
        }
        currentlyLoggedIn = true;
        return Promise.resolve(
          jsonResponse(200, {
            id: "user-1",
            email: "admin@example.com",
            createdAt: "2026-08-22T00:00:00.000Z",
          }),
        );
      }

      if (url.endsWith("/admin/moderation/hidden") && method === "GET") {
        if (!isAdmin) {
          return Promise.resolve(
            jsonResponse(403, { code: "FORBIDDEN", message: "Forbidden" }),
          );
        }
        if (neverResolveQueue) return new Promise(() => {});
        return Promise.resolve(jsonResponse(200, queue));
      }

      const restoreRequestMatch = /\/admin\/requests\/([^/]+)\/restore$/.exec(
        url,
      );
      if (restoreRequestMatch && method === "POST") {
        queue.requests = queue.requests.filter(
          (r) => r.id !== restoreRequestMatch[1],
        );
        return Promise.resolve(jsonResponse(204, undefined));
      }

      const deleteRequestMatch = /\/admin\/requests\/([^/]+)\/delete$/.exec(
        url,
      );
      if (deleteRequestMatch && method === "POST") {
        queue.requests = queue.requests.filter(
          (r) => r.id !== deleteRequestMatch[1],
        );
        return Promise.resolve(jsonResponse(204, undefined));
      }

      throw new Error(`Unmocked fetch: ${method} ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("AdminReview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an inline login form when signed out", async () => {
    installFakeBackend(makeQueue(), { loggedIn: false });
    render(<AdminReview />);

    expect(await screen.findByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
  });

  it("logs in from the inline form and shows the review list on success", async () => {
    installFakeBackend(makeQueue(), { loggedIn: false });
    render(<AdminReview />);

    fireEvent.change(await screen.findByLabelText("이메일"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByText("숨겨진 요청")).toBeInTheDocument();
  });

  it("shows an error and stays on the form when login fails", async () => {
    installFakeBackend(makeQueue(), { loggedIn: false, loginSucceeds: false });
    render(<AdminReview />);

    fireEvent.change(await screen.findByLabelText("이메일"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByText("이메일 또는 비밀번호가 올바르지 않습니다."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
  });

  it("shows a forbidden message for a logged-in non-admin", async () => {
    installFakeBackend(makeQueue(), { isAdmin: false });
    render(<AdminReview />);

    expect(
      await screen.findByText("이 계정은 접근 권한이 없어요."),
    ).toBeInTheDocument();
  });

  it("lists hidden requests and replies with their report counts for an admin", async () => {
    installFakeBackend(makeQueue());
    render(<AdminReview />);

    expect(await screen.findByText("숨겨진 요청")).toBeInTheDocument();
    expect(screen.getByText("숨겨진 답변")).toBeInTheDocument();
    expect(screen.getAllByText(/신고 3건/)).toHaveLength(2);
  });

  it("shows a skeleton, not the empty-state message, while the queue is loading", async () => {
    installFakeBackend(makeQueue(), { neverResolveQueue: true });
    const { container } = render(<AdminReview />);

    // "신고 검토" itself renders immediately regardless of status (outside
    // AdminStatusGate), so it can't be the wait condition — AdminNav's
    // logout button only shows once auth resolves to authenticated, which
    // is genuinely what this test needs to wait for. The queue GET never
    // resolves — this is specifically that in-between window.
    await screen.findByRole("button", { name: "로그아웃" });
    expect(
      screen.getByRole("heading", { name: "신고 검토" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("검토할 항목이 없어요.")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("keeps the '신고 검토' title visible while auth is still resolving", async () => {
    installFakeBackend(makeQueue(), { neverResolveAuth: true });

    render(<AdminReview />);

    expect(
      await screen.findByRole("heading", { name: "신고 검토" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "로그인" }),
    ).not.toBeInTheDocument();
  });

  it("removes a request from the list after restoring it", async () => {
    installFakeBackend(makeQueue());
    render(<AdminReview />);
    await screen.findByText("숨겨진 요청");

    fireEvent.click(screen.getAllByRole("button", { name: "복구" })[0]);

    await waitFor(() =>
      expect(screen.queryByText("숨겨진 요청")).not.toBeInTheDocument(),
    );
  });

  it("requires confirmation before permanently deleting a request", async () => {
    installFakeBackend(makeQueue());
    render(<AdminReview />);
    await screen.findByText("숨겨진 요청");

    fireEvent.click(screen.getAllByRole("button", { name: "영구 삭제" })[0]);
    expect(
      screen.getByText("영구 삭제할까요? 되돌릴 수 없어요."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByText("숨겨진 요청")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "영구 삭제" })[0]);
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "영구 삭제",
      }),
    );

    await waitFor(() =>
      expect(screen.queryByText("숨겨진 요청")).not.toBeInTheDocument(),
    );
  });

  it("shows an empty state when nothing needs review", async () => {
    installFakeBackend(makeQueue({ requests: [], replies: [] }));
    render(<AdminReview />);

    expect(
      await screen.findByText("검토할 항목이 없어요."),
    ).toBeInTheDocument();
  });

  it("shows a logout button when authenticated, not when signed out", async () => {
    installFakeBackend(makeQueue(), { loggedIn: false });
    render(<AdminReview />);
    await screen.findByLabelText("이메일");

    expect(
      screen.queryByRole("button", { name: "로그아웃" }),
    ).not.toBeInTheDocument();
  });
});
