import { render, screen } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NotificationDto } from "../lib/notifications/api";
import NotificationsPage from "./page";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function makeNotification(
  overrides: Partial<NotificationDto> = {},
): NotificationDto {
  return {
    id: "notification-1",
    type: "reply_received",
    requestId: "request-1",
    replyId: "reply-1",
    requestBody: "오늘 조금 힘들었어요.",
    createdAt: "2026-09-15T00:00:00.000Z",
    readAt: null,
    ...overrides,
  };
}

function installFakeBackend({
  authenticated,
  items = [],
}: {
  authenticated: boolean;
  items?: NotificationDto[];
}) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/auth/me")) {
        return authenticated
          ? Promise.resolve(
              jsonResponse(200, {
                id: "1",
                email: "test@example.com",
                createdAt: "2026-08-20T00:00:00.000Z",
              }),
            )
          : Promise.resolve(jsonResponse(401, { code: "UNAUTHORIZED" }));
      }
      if (url.includes("/notifications/unread-count")) {
        return Promise.resolve(jsonResponse(200, { count: items.length }));
      }
      if (url.includes("/notifications/read")) {
        return Promise.resolve(jsonResponse(204, null));
      }
      if (url.includes("/notifications")) {
        return Promise.resolve(
          jsonResponse(200, {
            items,
            page: 1,
            pageSize: 10,
            totalItems: items.length,
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

describe("NotificationsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prompts anonymous viewers to log in", async () => {
    installFakeBackend({ authenticated: false });

    render(<NotificationsPage />);

    expect(
      await screen.findByText("로그인하면 알림을 볼 수 있습니다."),
    ).toBeInTheDocument();
  });

  it("lists notifications with the request body preview and deep link", async () => {
    installFakeBackend({
      authenticated: true,
      items: [makeNotification()],
    });

    render(<NotificationsPage />);

    expect(await screen.findByText("오늘 조금 힘들었어요.")).toBeInTheDocument();
    expect(screen.getByText("답장이 도착했어요")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /오늘 조금 힘들었어요/ }),
    ).toHaveAttribute("href", "/records/requests/request-1?replyId=reply-1");
  });

  it("shows an empty state when there are no notifications", async () => {
    installFakeBackend({ authenticated: true, items: [] });

    render(<NotificationsPage />);

    expect(await screen.findByText("새 알림이 없어요.")).toBeInTheDocument();
  });

  it("marks notifications read on mount", async () => {
    const fetchMock = installFakeBackend({
      authenticated: true,
      items: [makeNotification()],
    });

    render(<NotificationsPage />);
    await screen.findByText("오늘 조금 힘들었어요.");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/read"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
