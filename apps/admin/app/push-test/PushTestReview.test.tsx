import { fireEvent, render, screen, waitFor } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockRouterReplace } from "../../vitest.setup";
import { PushTestReview } from "./PushTestReview";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

// Same fake-backend pattern as AccountsReview.test.tsx.
function installFakeBackend({
  loggedIn = true,
  isAdmin = true,
  testPushResponse,
}: {
  loggedIn?: boolean;
  isAdmin?: boolean;
  testPushResponse?: MockResponse;
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
        if (!isAdmin) {
          return Promise.resolve(
            jsonResponse(403, { code: "FORBIDDEN", message: "Forbidden" }),
          );
        }
        return Promise.resolve(jsonResponse(200, { isAdmin: true }));
      }

      if (url.endsWith("/admin/notifications/test") && method === "POST") {
        return Promise.resolve(
          testPushResponse ?? jsonResponse(200, { subscriptionCount: 2 }),
        );
      }

      throw new Error(`Unmocked fetch: ${method} ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("PushTestReview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to / when signed out", async () => {
    installFakeBackend({ loggedIn: false });
    render(<PushTestReview />);

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith("/"));
    expect(screen.queryByLabelText("이메일")).not.toBeInTheDocument();
  });

  it("redirects to / for a logged-in non-admin", async () => {
    installFakeBackend({ isAdmin: false });
    render(<PushTestReview />);

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith("/"));
    expect(screen.queryByLabelText("이메일")).not.toBeInTheDocument();
  });

  it("shows the form for an admin", async () => {
    installFakeBackend();
    render(<PushTestReview />);

    expect(await screen.findByLabelText("이메일")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "테스트 알림 보내기" }),
    ).toBeInTheDocument();
  });

  it("sends a test push and shows the subscription count", async () => {
    const fetchMock = installFakeBackend();
    render(<PushTestReview />);

    const input = await screen.findByLabelText<HTMLInputElement>("이메일");
    fireEvent.change(input, { target: { value: "member@example.com" } });
    fireEvent.click(
      screen.getByRole("button", { name: "테스트 알림 보내기" }),
    );

    expect(await screen.findByText("2개 기기로 전송했어요.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/notifications/test"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "member@example.com", persist: false }),
      }),
    );
  });

  it("shows a distinct message when the account has no subscribed devices", async () => {
    installFakeBackend({
      testPushResponse: jsonResponse(200, { subscriptionCount: 0 }),
    });
    render(<PushTestReview />);

    const input = await screen.findByLabelText<HTMLInputElement>("이메일");
    fireEvent.change(input, { target: { value: "member@example.com" } });
    fireEvent.click(
      screen.getByRole("button", { name: "테스트 알림 보내기" }),
    );

    expect(
      await screen.findByText("이 계정은 구독된 기기가 없어요."),
    ).toBeInTheDocument();
  });

  it("includes persist in the request when 알림 목록에도 남기기 is toggled on", async () => {
    const fetchMock = installFakeBackend();
    render(<PushTestReview />);

    const input = await screen.findByLabelText<HTMLInputElement>("이메일");
    fireEvent.change(input, { target: { value: "member@example.com" } });
    fireEvent.click(screen.getByLabelText("알림 목록에도 남기기"));
    fireEvent.click(
      screen.getByRole("button", { name: "테스트 알림 보내기" }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/notifications/test"),
        expect.objectContaining({
          body: JSON.stringify({ email: "member@example.com", persist: true }),
        }),
      ),
    );
  });
});
