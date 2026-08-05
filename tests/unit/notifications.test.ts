import { NotificationType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const count = vi.hoisted(() => vi.fn());
const findMany = vi.hoisted(() => vi.fn());
const findFirst = vi.hoisted(() => vi.fn());
const updateMany = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    notification: { count, findMany, findFirst, updateMany }
  }
}));

import {
  getNotificationSummary,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationMessage
} from "@/server/notifications";

describe("notifications", () => {
  beforeEach(() => {
    count.mockReset();
    findMany.mockReset();
    findFirst.mockReset();
    updateMany.mockReset();
  });

  it("counts unread notifications for a user", async () => {
    count.mockResolvedValue(3);
    await expect(getUnreadNotificationCount("user_1")).resolves.toBe(3);
  });

  it("summarizes unread count and newest notification for a user", async () => {
    const latestCreatedAt = new Date("2026-07-25T01:30:00.000Z");
    count.mockResolvedValue(4);
    findFirst.mockResolvedValue({ id: "notification_latest", createdAt: latestCreatedAt });

    await expect(getNotificationSummary("user_1")).resolves.toEqual({
      unreadCount: 4,
      latestNotificationId: "notification_latest",
      latestNotificationCreatedAt: latestCreatedAt.toISOString()
    });
  });

  it("formats comfort notification messages", () => {
    expect(
      notificationMessage({
        type: NotificationType.FIRST_REPLY_ON_REQUEST,
        actor: { nickname: "따뜻한사람" },
        request: { body: "오늘 지쳤어요" },
        reply: { body: "오늘도 충분히 애썼어요." }
      })
    ).toContain("첫 답변");
  });

  it("lists recent comfort notifications", async () => {
    findMany.mockResolvedValue([
      {
        id: "notification_1",
        type: NotificationType.FIRST_REPLY_ON_REQUEST,
        readAt: null,
        createdAt: new Date("2026-07-17T08:00:00.000Z"),
        actor: { nickname: "따뜻한사람" },
        request: { id: "request_1", body: "오늘 힘든 일이 있었어요" },
        reply: { body: "정말 잘 버텼어요." }
      }
    ]);

    await expect(listNotifications("user_1")).resolves.toEqual([
      {
        id: "notification_1",
        type: NotificationType.FIRST_REPLY_ON_REQUEST,
        readAt: null,
        createdAt: new Date("2026-07-17T08:00:00.000Z"),
        actorNickname: "따뜻한사람",
        requestId: "request_1",
        requestPreview: "오늘 힘든 일이 있었어요",
        bodyPreview: "정말 잘 버텼어요."
      }
    ]);
  });

  it("marks notifications as read", async () => {
    const readAt = new Date("2026-07-17T08:10:00.000Z");
    updateMany.mockResolvedValue({ count: 2 });

    await expect(markAllNotificationsRead("user_1", readAt)).resolves.toEqual({ count: 2 });
    await markNotificationRead("user_1", "notification_1", readAt);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "notification_1", recipientUserId: "user_1", readAt: null },
      data: { readAt }
    });
  });
});
