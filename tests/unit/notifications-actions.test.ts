import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const markAllNotificationsRead = vi.hoisted(() => vi.fn());
const markNotificationRead = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/notifications", () => ({ markAllNotificationsRead, markNotificationRead }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { markNotificationReadAction, markNotificationsRead } from "@/app/notifications/actions";

describe("notification actions", () => {
  beforeEach(() => {
    auth.mockReset();
    markAllNotificationsRead.mockReset();
    markNotificationRead.mockReset();
    revalidatePath.mockReset();
  });

  it("marks the current user's notifications as read and revalidates notification surfaces", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    markAllNotificationsRead.mockResolvedValue({ count: 2 });

    await markNotificationsRead();

    expect(markAllNotificationsRead).toHaveBeenCalledWith("user_1");
    expect(revalidatePath).toHaveBeenCalledWith("/notifications");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("marks one notification as read and revalidates notification surfaces", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    markNotificationRead.mockResolvedValue({ count: 1 });
    const formData = new FormData();
    formData.set("notificationId", "notification_1");

    await markNotificationReadAction(formData);

    expect(markNotificationRead).toHaveBeenCalledWith("user_1", "notification_1");
    expect(revalidatePath).toHaveBeenCalledWith("/notifications");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects unauthenticated reads", async () => {
    auth.mockResolvedValue(null);

    await expect(markNotificationsRead()).rejects.toThrow("AUTH_REQUIRED");
    expect(markAllNotificationsRead).not.toHaveBeenCalled();
  });

  it("rejects a single-notification read without a notification id", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });

    await expect(markNotificationReadAction(new FormData())).rejects.toThrow("NOTIFICATION_ID_REQUIRED");
    expect(markNotificationRead).not.toHaveBeenCalled();
  });
});
