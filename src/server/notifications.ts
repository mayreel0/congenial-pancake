import { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  readAt: Date | null;
  createdAt: Date;
  actorNickname: string;
  requestId: string;
  requestPreview: string;
  bodyPreview: string;
};

export type NotificationMessageInput = {
  type: NotificationType;
  actor: { nickname: string } | null;
  request: { body: string } | null;
  reply: { body: string } | null;
};

export type NotificationSummary = {
  unreadCount: number;
  latestNotificationId: string | null;
  latestNotificationCreatedAt: string | null;
};

function previewText(value: string | null | undefined): string {
  const normalized = (value ?? "").trim();
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
}

export function notificationMessage(notification: NotificationMessageInput): string {
  const actorNickname = notification.actor?.nickname ?? "누군가";
  if (notification.type === NotificationType.FIRST_REPLY_ON_REQUEST) {
    return `${actorNickname}님이 내 위로 요청에 첫 답변을 남겼습니다.`;
  }
  return `${actorNickname}님이 내 위로 요청에 답변을 남겼습니다.`;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { recipientUserId: userId, readAt: null }
  });
}

export async function getNotificationSummary(userId: string): Promise<NotificationSummary> {
  const [unreadCount, latestNotification] = await Promise.all([
    getUnreadNotificationCount(userId),
    db.notification.findFirst({
      where: { recipientUserId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true }
    })
  ]);

  return {
    unreadCount,
    latestNotificationId: latestNotification?.id ?? null,
    latestNotificationCreatedAt: latestNotification?.createdAt.toISOString() ?? null
  };
}

export async function listNotifications(userId: string): Promise<NotificationListItem[]> {
  const notifications = await db.notification.findMany({
    where: { recipientUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      actor: { select: { nickname: true } },
      request: { select: { id: true, body: true } },
      reply: { select: { body: true } }
    }
  });

  return notifications
    .filter((notification) => notification.request !== null)
    .map((notification) => ({
      id: notification.id,
      type: notification.type,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      actorNickname: notification.actor?.nickname ?? "누군가",
      requestId: notification.request?.id ?? "",
      requestPreview: previewText(notification.request?.body),
      bodyPreview: previewText(notification.reply?.body)
    }));
}

export async function markAllNotificationsRead(userId: string, readAt = new Date()) {
  return db.notification.updateMany({
    where: { recipientUserId: userId, readAt: null },
    data: { readAt }
  });
}

export async function markNotificationRead(userId: string, notificationId: string, readAt = new Date()) {
  return db.notification.updateMany({
    where: { id: notificationId, recipientUserId: userId, readAt: null },
    data: { readAt }
  });
}
