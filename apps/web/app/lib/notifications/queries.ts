"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
} from "./api";

// 답장이 달리면 useNotificationStream이 실시간으로 이 값을 invalidate하지만,
// 그 연결이 끊겼거나 아예 없던 동안 놓친 알림까지 잡아내는 보완책으로 60초
// 폴링은 그대로 유지한다.
const UNREAD_COUNT_POLL_MS = 60_000;

export const notificationKeys = {
  unreadCount: ["notifications", "unreadCount"] as const,
  // 페이지/페이지크기 무관하게 모든 list(...) 변형을 한 번에 invalidate하기
  // 위한 prefix 키 — useNotificationStream이 이걸로 무효화한다.
  listAll: ["notifications", "list"] as const,
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
