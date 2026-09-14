"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
} from "./api";

const NOTIFICATIONS_PAGE_SIZE = 10;

// 답장이 달리면 useNotificationStream(다음 PR)이 실시간으로 이 값을
// invalidate하지만, 그 연결이 끊겼거나 아예 없던 동안 놓친 알림까지
// 잡아내는 보완책으로 60초 폴링은 그대로 유지한다.
const UNREAD_COUNT_POLL_MS = 60_000;

const notificationKeys = {
  unreadCount: ["notifications", "unreadCount"] as const,
  list: (page: number) => ["notifications", "list", page] as const,
};

// enabled는 호출부(NotificationBell)가 useAuth()의 status로 넘겨준다 —
// 비회원은 애초에 폴링 자체가 안 돌아야 하므로.
export function useUnreadCountQuery(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: fetchUnreadCount,
    enabled,
    refetchInterval: UNREAD_COUNT_POLL_MS,
  });
}

// 드롭다운을 열었을 때만 조회 — enabled로 게이팅.
export function useNotificationsQuery(page: number, enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.list(page),
    queryFn: () => fetchNotifications(page, NOTIFICATIONS_PAGE_SIZE),
    enabled,
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.setQueryData(notificationKeys.unreadCount, { count: 0 });
    },
  });
}
