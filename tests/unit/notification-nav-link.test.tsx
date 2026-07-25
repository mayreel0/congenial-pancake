// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationNavLink from "@/components/NotificationNavLink";

async function flushPolling() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("NotificationNavLink", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders the initial unread count and updates after visible interval polling", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ unreadCount: 5, latestNotificationId: "n5", latestNotificationCreatedAt: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<NotificationNavLink initialUnreadCount={2} />);

    expect(screen.getByRole("link", { name: "알림 2" })).toHaveAttribute("href", "/notifications");

    await act(async () => {
      vi.advanceTimersByTime(30000);
      await flushPolling();
    });

    expect(screen.getByRole("link", { name: "알림 5" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/notifications/summary", { cache: "no-store" });
  });

  it("polls immediately on focus and keeps the previous count on failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ unreadCount: 7, latestNotificationId: "n7", latestNotificationCreatedAt: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    render(<NotificationNavLink initialUnreadCount={1} />);

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await flushPolling();
    });
    expect(screen.getByRole("link", { name: "알림 7" })).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await flushPolling();
    });

    expect(screen.getByRole("link", { name: "알림 7" })).toBeInTheDocument();
  });
});
