import Link from "next/link";
import { markNotificationReadAction, markNotificationsRead } from "@/app/notifications/actions";
import NotificationsPageRefresh from "@/components/NotificationsPageRefresh";
import { auth } from "@/lib/auth";
import { getNotificationSummary, listNotifications, notificationMessage, type NotificationListItem } from "@/server/notifications";

export const dynamic = "force-dynamic";

function pageNotificationMessage(notification: NotificationListItem): string {
  return notificationMessage({
    type: notification.type,
    actor: { nickname: notification.actorNickname },
    request: { body: notification.requestPreview },
    reply: { body: notification.bodyPreview }
  });
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

  const [notifications, notificationSummary] = await Promise.all([
    listNotifications(session.user.id),
    getNotificationSummary(session.user.id)
  ]);
  const unreadCount = notificationSummary.unreadCount;

  return (
    <section className="page-section">
      <NotificationsPageRefresh initialSummary={notificationSummary} />
      <div className="section-heading-row">
        <div>
          <h1>알림</h1>
          <p>내 위로 요청에 새 답변이 생기면 여기에서 확인할 수 있습니다.</p>
          <small className="state-note">
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : "모든 알림을 읽었습니다"}
          </small>
        </div>
        {unreadCount > 0 ? (
          <form action={markNotificationsRead}>
            <button type="submit">모두 읽음 처리</button>
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
              <div className="notification-title-row">
                <p>{pageNotificationMessage(notification)}</p>
                <span>{notification.readAt === null ? "읽지 않음" : "읽음"}</span>
              </div>
              <blockquote>{notification.bodyPreview}</blockquote>
              <div className="notification-footer">
                <small>
                  <Link href="/">{notification.requestPreview}</Link> ·{" "}
                  {notification.createdAt.toLocaleString("ko-KR")}
                </small>
                {notification.readAt === null ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <button type="submit">이 알림 읽음</button>
                  </form>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <p>아직 새 알림이 없습니다.</p>
            <Link href="/">위로 요청 보러 가기</Link>
          </div>
        )}
      </div>
    </section>
  );
}
