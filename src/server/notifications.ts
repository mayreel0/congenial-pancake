import { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  readAt: Date | null;
  createdAt: Date;
  actorNickname: string;
  postId: string;
  postTitle: string;
  bodyPreview: string;
};

function previewText(value: string | null | undefined): string {
  const normalized = (value ?? "").trim();
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { recipientUserId: userId, readAt: null }
  });
}

export async function listNotifications(userId: string): Promise<NotificationListItem[]> {
  const notifications = await db.notification.findMany({
    where: { recipientUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      actor: { select: { nickname: true } },
      post: { select: { id: true, title: true } },
      comment: { select: { body: true } },
      reply: { select: { body: true } }
    }
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    actorNickname: notification.actor?.nickname ?? "칭찬러",
    postId: notification.post.id,
    postTitle: notification.post.title,
    bodyPreview: previewText(notification.reply?.body ?? notification.comment?.body)
  }));
}

export async function markAllNotificationsRead(userId: string, readAt = new Date()) {
  return db.notification.updateMany({
    where: { recipientUserId: userId, readAt: null },
    data: { readAt }
  });
}
