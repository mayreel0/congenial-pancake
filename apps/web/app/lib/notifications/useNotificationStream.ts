"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "api";
import { notificationKeys } from "./queries";

// Real-time half of the badge/list — see useUnreadCountQuery's comment for
// the polling half this pairs with. The stream payload itself is just a
// minimal "something changed" ping (see NotificationsController.stream on
// the backend), so this only invalidates rather than reading event.data —
// the next refetch of unreadCount/the list is what actually shows the new
// content. withCredentials is required since the API is a different origin
// (api.onseol.com, where the session cookie lives) — a plain EventSource
// wouldn't send it.
export function useNotificationStream(enabled: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const source = new EventSource(`${API_BASE_URL}/notifications/stream`, {
      withCredentials: true,
    });
    source.onmessage = () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount,
      });
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.listAll,
      });
    };

    return () => source.close();
  }, [enabled, queryClient]);
}
