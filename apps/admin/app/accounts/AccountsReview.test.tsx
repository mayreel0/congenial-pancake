import { fireEvent, render, screen } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountsReview } from "./AccountsReview";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

// Same fake-backend pattern as SettingsReview.test.tsx.
function installFakeBackend({
  loggedIn = true,
  isAdmin = true,
  neverResolveWhoami = false,
}: {
  loggedIn?: boolean;
  isAdmin?: boolean;
  neverResolveWhoami?: boolean;
} = {}) {
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
            email: "admin@example.com",
            createdAt: "2026-08-22T00:00:00.000Z",
          }),
        );
      }

      if (url.endsWith("/admin/whoami")) {
        if (neverResolveWhoami) return new Promise(() => {});
        if (!isAdmin) {
          return Promise.resolve(
            jsonResponse(403, { code: "FORBIDDEN", message: "Forbidden" }),
          );
        }
        return Promise.resolve(jsonResponse(200, { isAdmin: true }));
      }

      if (
        url.endsWith("/admin/users/password-reset-link") &&
        method === "POST"
      ) {
        return Promise.resolve(
          jsonResponse(200, { url: "https://onseol.com/reset/token123" }),
        );
      }

      throw new Error(`Unmocked fetch: ${method} ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("AccountsReview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an inline login form when signed out", async () => {
    installFakeBackend({ loggedIn: false });
    render(<AccountsReview />);

    expect(await screen.findByLabelText("이메일")).toBeInTheDocument();
  });

  it("shows a forbidden message for a logged-in non-admin, without ever showing the form", async () => {
    installFakeBackend({ isAdmin: false });
    render(<AccountsReview />);

    expect(
      await screen.findByText("이 계정은 접근 권한이 없어요."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("이메일")).not.toBeInTheDocument();
  });

  it("shows the form for an admin", async () => {
    installFakeBackend();
    render(<AccountsReview />);

    expect(await screen.findByLabelText("이메일")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "링크 발급" }),
    ).toBeInTheDocument();
  });

  it("stays on the generic loading skeleton while whoami is still resolving", async () => {
    installFakeBackend({ neverResolveWhoami: true });
    render(<AccountsReview />);

    // AdminStatusGate's generic skeleton has no accessible label of its own
    // to query for — asserting the form/forbidden text is absent while
    // still mounted is the meaningful signal here (matches how
    // SettingsReview.test.tsx's equivalent in-between-window test works).
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByLabelText("이메일")).not.toBeInTheDocument();
    expect(
      screen.queryByText("이 계정은 접근 권한이 없어요."),
    ).not.toBeInTheDocument();
  });

  it("issues a link and shows it", async () => {
    installFakeBackend();
    render(<AccountsReview />);

    const input = await screen.findByLabelText("이메일");
    fireEvent.change(input, { target: { value: "oauth-user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "링크 발급" }));

    expect(
      await screen.findByText("https://onseol.com/reset/token123"),
    ).toBeInTheDocument();
  });
});
