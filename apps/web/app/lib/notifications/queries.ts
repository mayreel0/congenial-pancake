"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
} from "./api";

// 답장이 달리면 useNotificationStream(다음 PR)이 실시간으로 이 값을
// invalidate하지만, 그 연결이 끊겼거나 아예 없던 동안 놓친 알림까지
// 잡아내는 보완책으로 60초 폴링은 그대로 유지한다.
const UNREAD_COUNT_POLL_MS = 60_000;

const notificationKeys = {
  unreadCount: ["notifications", "unreadCount"] as const,
  list: (page: number, pageSize: number) =>
    ["notifications", "list", page, pageSize] as const,
};

// enabled는 호출부(ProfileMenu)가 useAuth()의 status로 넘겨준다 — 비회원은
// 애초에 폴링 자체가 안 돌아야 하므로.
export function useUnreadCountQuery(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: fetchUnreadCount,
    enabled,
    refetchInterval: UNREAD_COUNT_POLL_MS,
  });
}

// /notifications 전용 알림 페이지에서 사용.
export function useNotificationsQuery(
  page: number,
  pageSize: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: notificationKeys.list(page, pageSize),
    queryFn: () => fetchNotifications(page, pageSize),
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
