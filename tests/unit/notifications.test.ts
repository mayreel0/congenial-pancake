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
  markNotificationRead
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

    expect(count).toHaveBeenCalledWith({
      where: { recipientUserId: "user_1", readAt: null }
    });
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

    expect(count).toHaveBeenCalledWith({
      where: { recipientUserId: "user_1", readAt: null }
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { recipientUserId: "user_1" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true }
    });
  });

  it("returns null latest fields when a user has no notifications", async () => {
    count.mockResolvedValue(0);
    findFirst.mockResolvedValue(null);

    await expect(getNotificationSummary("user_1")).resolves.toEqual({
      unreadCount: 0,
      latestNotificationId: null,
      latestNotificationCreatedAt: null
    });
  });

  it("lists recent notifications with linked actors and posts", async () => {
    findMany.mockResolvedValue([
      {
        id: "notification_1",
        type: NotificationType.COMMENT_ON_POST,
        readAt: null,
        createdAt: new Date("2026-07-17T08:00:00.000Z"),
        actor: { nickname: "따뜻한사람" },
        post: { id: "post_1", title: "오늘 힘든 일이 있었어요" },
        comment: { body: "정말 잘 버텼어요." },
        reply: null
      }
    ]);

    const notifications = await listNotifications("user_1");

    expect(findMany).toHaveBeenCalledWith({
      where: { recipientUserId: "user_1" },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        actor: { select: { nickname: true } },
        post: { select: { id: true, title: true } },
        comment: { select: { body: true } },
        reply: { select: { body: true } }
      }
    });
    expect(notifications).toEqual([
      {
        id: "notification_1",
        type: NotificationType.COMMENT_ON_POST,
        readAt: null,
        createdAt: new Date("2026-07-17T08:00:00.000Z"),
        actorNickname: "따뜻한사람",
        postId: "post_1",
        postTitle: "오늘 힘든 일이 있었어요",
        bodyPreview: "정말 잘 버텼어요."
      }
    ]);
  });

  it("marks only the current user's unread notifications as read", async () => {
    const readAt = new Date("2026-07-17T08:10:00.000Z");
    updateMany.mockResolvedValue({ count: 2 });

    await expect(markAllNotificationsRead("user_1", readAt)).resolves.toEqual({ count: 2 });

    expect(updateMany).toHaveBeenCalledWith({
      where: { recipientUserId: "user_1", readAt: null },
      data: { readAt }
    });
  });

  it("marks one current-user unread notification as read", async () => {
    const readAt = new Date("2026-07-17T08:15:00.000Z");
    updateMany.mockResolvedValue({ count: 1 });

    await expect(markNotificationRead("user_1", "notification_1", readAt)).resolves.toEqual({ count: 1 });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "notification_1", recipientUserId: "user_1", readAt: null },
      data: { readAt }
    });
  });
});
