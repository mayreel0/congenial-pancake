import { fireEvent, render, screen, waitFor, within } from "../../lib/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";

type MockResponses = {
  unreadCount?: number;
  notifications?: {
    id: string;
    createdAt: string;
  }[];
};

function mockAuthenticated({
  unreadCount = 0,
  notifications = [],
}: MockResponses = {}) {
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
    (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: "1",
              email: "test@example.com",
              createdAt: "2026-08-20T00:00:00.000Z",
            }),
        });
      }
      if (url.includes("/notifications/unread-count")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ count: unreadCount }),
        });
      }
      if (url.includes("/notifications/read")) {
        return Promise.resolve({ ok: true, status: 204, json: () => null });
      }
      if (url.includes("/notifications")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              items: notifications.map((n) => ({
                id: n.id,
                type: "reply_received",
                requestId: "request-1",
                replyId: "reply-1",
                createdAt: n.createdAt,
                readAt: null,
              })),
              page: 1,
              pageSize: 10,
              totalItems: notifications.length,
              totalPages: 1,
            }),
        });
      }

      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      });
    },
  );
}

describe("NotificationBell", () => {
  it("renders nothing when anonymous", async () => {
    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.queryByLabelText("알림")).not.toBeInTheDocument();
    });
  });

  it("shows the unread count badge when authenticated", async () => {
    mockAuthenticated({ unreadCount: 3 });
    render(<NotificationBell />);

    const trigger = await screen.findByLabelText("알림");
    expect(await within(trigger).findByText("3")).toBeInTheDocument();
  });

  it("caps the badge at 9+", async () => {
    mockAuthenticated({ unreadCount: 42 });
    render(<NotificationBell />);

    const trigger = await screen.findByLabelText("알림");
    expect(await within(trigger).findByText("9+")).toBeInTheDocument();
  });

  it("shows no badge when unread count is zero", async () => {
    mockAuthenticated({ unreadCount: 0 });
    render(<NotificationBell />);

    const trigger = await screen.findByLabelText("알림");
    await waitFor(() => {
      expect(within(trigger).queryByText(/\d/)).not.toBeInTheDocument();
    });
  });

  it("opens the dropdown, lists notifications, and marks them read", async () => {
    mockAuthenticated({
      unreadCount: 1,
      notifications: [{ id: "n1", createdAt: "2026-09-15T00:00:00.000Z" }],
    });
    render(<NotificationBell />);

    const trigger = await screen.findByLabelText("알림");
    fireEvent.click(trigger);

    expect(
      await screen.findByText("내가 남긴 고민에 답장이 도착했어요."),
    ).toBeInTheDocument();

    // Marking read fires unconditionally on open (not gated on the
    // client's current unread count, which may not have loaded yet) — a
    // no-op server-side when there's nothing to mark, so this is safe to
    // assert regardless of timing.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/notifications/read"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("shows an empty state when there are no notifications", async () => {
    mockAuthenticated({ unreadCount: 0, notifications: [] });
    render(<NotificationBell />);

    const trigger = await screen.findByLabelText("알림");
    fireEvent.click(trigger);

    expect(await screen.findByText("새 알림이 없어요.")).toBeInTheDocument();
  });
});
