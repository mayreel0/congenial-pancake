import { NotificationType } from "@prisma/client";
import Link from "next/link";
import { markNotificationsRead } from "@/app/notifications/actions";
import { auth } from "@/lib/auth";
import { listNotifications, type NotificationListItem } from "@/server/notifications";

export const dynamic = "force-dynamic";

function notificationMessage(notification: NotificationListItem): string {
  if (notification.type === NotificationType.REPLY_ON_COMMENT) {
    return `${notification.actorNickname}님이 내 칭찬에 답글을 남겼습니다.`;
  }
  return `${notification.actorNickname}님이 내 글에 칭찬을 남겼습니다.`;
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <section className="page-section">
        <h1>로그인이 필요합니다</h1>
        <p>알림은 인증된 계정만 볼 수 있습니다.</p>
        <Link href="/login">로그인</Link>
      </section>
    );
  }

  const notifications = await listNotifications(session.user.id);

  return (
    <section className="page-section">
      <div className="section-heading-row">
        <div>
          <h1>알림</h1>
          <p>내 글과 칭찬에 새 반응이 생기면 여기에서 확인할 수 있습니다.</p>
        </div>
        {notifications.some((notification) => notification.readAt === null) ? (
          <form action={markNotificationsRead}>
            <button type="submit">모두 읽음</button>
          </form>
        ) : null}
      </div>

      <div className="stack-list">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <article
              key={notification.id}
              className={notification.readAt === null ? "notification-item unread" : "notification-item"}
            >
              <p>{notificationMessage(notification)}</p>
              <blockquote>{notification.bodyPreview}</blockquote>
              <small>
                <Link href={`/posts/${notification.postId}`}>{notification.postTitle}</Link> ·{" "}
                {notification.createdAt.toLocaleString("ko-KR")}
              </small>
            </article>
          ))
        ) : (
          <p>아직 새 알림이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
