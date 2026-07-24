import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const markAllNotificationsRead = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/notifications", () => ({ markAllNotificationsRead }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { markNotificationsRead } from "@/app/notifications/actions";

describe("notification actions", () => {
  beforeEach(() => {
    auth.mockReset();
    markAllNotificationsRead.mockReset();
    revalidatePath.mockReset();
  });

  it("marks the current user's notifications as read and revalidates notification surfaces", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    markAllNotificationsRead.mockResolvedValue({ count: 2 });

    await markNotificationsRead();

    expect(markAllNotificationsRead).toHaveBeenCalledWith("user_1");
    expect(revalidatePath).toHaveBeenCalledWith("/notifications");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("rejects unauthenticated reads", async () => {
    auth.mockResolvedValue(null);

    await expect(markNotificationsRead()).rejects.toThrow("AUTH_REQUIRED");
    expect(markAllNotificationsRead).not.toHaveBeenCalled();
  });
});
