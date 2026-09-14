"use client";

import Link from "next/link";
import { useState } from "react";
import { Skeleton } from "ui/Skeleton";
import { POPOVER_EXIT_MS, useAnimatedPresence } from "ui/useAnimatedPresence";
import { useDismissOnOutsideClick } from "ui/useDismissOnOutsideClick";
import { formatRelativeTime } from "../../lib/format";
import { useAuth } from "../../lib/auth/useAuth";
import {
  useMarkAllNotificationsReadMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
} from "../../lib/notifications/queries";
import type { NotificationDto } from "../../lib/notifications/api";
import { BellIcon } from "../shared/icons";

const MAX_BADGE_COUNT = 9;

function badgeLabel(count: number): string {
  return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
}

type NotificationListProps = {
  isPending: boolean;
  items: NotificationDto[] | undefined;
  onItemClick(): void;
};

function NotificationList({
  isPending,
  items,
  onItemClick,
}: NotificationListProps) {
  if (isPending) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <p className="px-3 py-4 text-sm text-muted">새 알림이 없어요.</p>;
  }

  return (
    <ul>
      {items.map((notification) => (
        <li key={notification.id}>
          <Link
            className="block px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted"
            href="/records?tab=requests"
            onClick={onItemClick}
          >
            <p>내가 남긴 고민에 답장이 도착했어요.</p>
            <p className="mt-0.5 text-xs text-muted">
              {formatRelativeTime(notification.createdAt)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ServiceNav의 "개인 영역" nav에 ProfileMenu와 형제로 렌더 — 비회원은
// 알림을 받을 방법이 없어(로그인 세션 없음) 아예 렌더하지 않는다(폴링도
// 안 돎). 항목 클릭 시 지금은 /records로만 이동 — 특정 답장으로 실제
// 딥링크하는 건 딥링크 상세 페이지가 생기는 다음 단계에서 이 링크를
// 그쪽으로 바꾼다(계획된 단계적 적용, 지금도 완전히 동작하는 목적지).
export function NotificationBell() {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useDismissOnOutsideClick<HTMLDivElement>(open, () =>
    setOpen(false),
  );
  const shouldRenderMenu = useAnimatedPresence(open, POPOVER_EXIT_MS);
  const enabled = status === "authenticated";
  const unreadCountQuery = useUnreadCountQuery(enabled);
  const notificationsQuery = useNotificationsQuery(1, enabled && open);
  const markAllRead = useMarkAllNotificationsReadMutation();

  if (!enabled) return null;

  const unreadCount = unreadCountQuery.data?.count ?? 0;

  function handleToggle() {
    setOpen((wasOpen) => {
      const nextOpen = !wasOpen;
      // Always fire on open, not gated on the client's current unreadCount
      // — that count may not have loaded yet (e.g. right after page load),
      // and marking read when there's nothing to mark is a harmless no-op
      // server-side.
      if (nextOpen) markAllRead.mutate();
      return nextOpen;
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-label="알림"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
        type="button"
        onClick={handleToggle}
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
            {badgeLabel(unreadCount)}
          </span>
        )}
      </button>
      {shouldRenderMenu && (
        <div
          aria-label="알림 목록"
          className={`absolute right-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-lg border border-line bg-surface shadow-sm ${
            open ? "onseol-popover-enter" : "onseol-popover-leave"
          }`}
        >
          <p className="border-b border-line px-3 py-2 text-xs font-semibold text-muted">
            알림
          </p>
          <NotificationList
            isPending={notificationsQuery.isPending}
            items={notificationsQuery.data?.items}
            onItemClick={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
