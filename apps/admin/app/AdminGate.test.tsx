import { fireEvent, render, screen, waitFor } from "./lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockRouterReplace } from "../vitest.setup";
import { AdminGate } from "./AdminGate";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

// Same fake-backend pattern as AdminReview.test.tsx.
function installFakeBackend({
  loggedIn = true,
  isAdmin = true,
  loginSucceeds = true,
}: {
  loggedIn?: boolean;
  isAdmin?: boolean;
  loginSucceeds?: boolean;
} = {}) {
  let currentlyLoggedIn = loggedIn;

  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";

      if (url.endsWith("/auth/me")) {
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

      if (url.endsWith("/admin/whoami")) {
        if (!isAdmin) {
          return Promise.resolve(
            jsonResponse(403, { code: "FORBIDDEN", message: "Forbidden" }),
          );
        }
        return Promise.resolve(jsonResponse(200, { isAdmin: true }));
      }

      if (url.endsWith("/auth/logout") && method === "POST") {
        currentlyLoggedIn = false;
        return Promise.resolve(jsonResponse(204, undefined));
      }

      throw new Error(`Unmocked fetch: ${method} ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("AdminGate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a login form when signed out", async () => {
    installFakeBackend({ loggedIn: false });
    render(<AdminGate />);

    expect(await screen.findByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
  });

  it("logs in and redirects to /review on success", async () => {
    installFakeBackend({ loggedIn: false });
    render(<AdminGate />);

    fireEvent.change(await screen.findByLabelText("이메일"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() =>
      expect(mockRouterReplace).toHaveBeenCalledWith("/review"),
    );
  });

  it("shows an error and stays on the form when login fails", async () => {
    installFakeBackend({ loggedIn: false, loginSucceeds: false });
    render(<AdminGate />);

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

  it("shows a forbidden message with a logout option for a logged-in non-admin", async () => {
    installFakeBackend({ isAdmin: false });
    render(<AdminGate />);

    expect(
      await screen.findByText("이 계정은 접근 권한이 없어요."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "로그아웃" }),
    ).toBeInTheDocument();
  });

  it("redirects to /review immediately for an already-authorized admin", async () => {
    installFakeBackend();
    render(<AdminGate />);

    await waitFor(() =>
      expect(mockRouterReplace).toHaveBeenCalledWith("/review"),
    );
    expect(screen.queryByLabelText("이메일")).not.toBeInTheDocument();
  });
});
