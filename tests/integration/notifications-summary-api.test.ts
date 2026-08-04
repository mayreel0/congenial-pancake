import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getNotificationSummaryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/server/notifications", () => ({
  getNotificationSummary: getNotificationSummaryMock
}));

describe("notifications summary API route", () => {
  beforeEach(() => {
    vi.resetModules();
    authMock.mockReset();
    getNotificationSummaryMock.mockReset();
  });

  it("returns 401 for unauthenticated visitors", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/notifications/summary/route");

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "AUTH_REQUIRED" });
    expect(getNotificationSummaryMock).not.toHaveBeenCalled();
  });

  it("returns the current user's notification summary", async () => {
    const summary = {
      unreadCount: 2,
      latestNotificationId: "notification_2",
      latestNotificationCreatedAt: "2026-07-25T01:30:00.000Z"
    };
    authMock.mockResolvedValue({ user: { id: "user_1" } });
    getNotificationSummaryMock.mockResolvedValue(summary);
    const { GET } = await import("@/app/api/notifications/summary/route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(summary);
    expect(getNotificationSummaryMock).toHaveBeenCalledWith("user_1");
  });
});
