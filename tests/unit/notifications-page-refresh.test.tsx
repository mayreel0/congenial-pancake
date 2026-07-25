// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationsPageRefresh from "@/components/NotificationsPageRefresh";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock })
}));

async function flushPolling() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("NotificationsPageRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refreshMock.mockReset();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("refreshes the server-rendered notifications page when unread count changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ unreadCount: 2, latestNotificationId: "n1", latestNotificationCreatedAt: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NotificationsPageRefresh
        initialSummary={{ unreadCount: 1, latestNotificationId: "n1", latestNotificationCreatedAt: null }}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(30000);
      await flushPolling();
    });

    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("refreshes immediately on visibilitychange when the latest notification changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          unreadCount: 1,
          latestNotificationId: "n2",
          latestNotificationCreatedAt: "2026-07-25T01:30:00.000Z"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NotificationsPageRefresh
        initialSummary={{ unreadCount: 1, latestNotificationId: "n1", latestNotificationCreatedAt: null }}
      />
    );

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await flushPolling();
    });

    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("does not refresh when summary polling fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(
      <NotificationsPageRefresh
        initialSummary={{ unreadCount: 1, latestNotificationId: "n1", latestNotificationCreatedAt: null }}
      />
    );

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await flushPolling();
    });

    expect(refreshMock).not.toHaveBeenCalled();
  });
});
