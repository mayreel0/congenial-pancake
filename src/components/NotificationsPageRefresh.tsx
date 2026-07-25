"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

type NotificationSummary = {
  unreadCount: number;
  latestNotificationId: string | null;
  latestNotificationCreatedAt: string | null;
};

type NotificationsPageRefreshProps = {
  initialSummary: NotificationSummary;
};

function didSummaryChange(current: NotificationSummary, next: NotificationSummary) {
  return current.unreadCount !== next.unreadCount || current.latestNotificationId !== next.latestNotificationId;
}

export default function NotificationsPageRefresh({ initialSummary }: NotificationsPageRefreshProps) {
  const router = useRouter();
  const summaryRef = useRef(initialSummary);

  const pollSummary = useCallback(async () => {
    if (document.visibilityState !== "visible") return;

    try {
      const response = await fetch("/api/notifications/summary", { cache: "no-store" });
      if (!response.ok) return;

      const nextSummary = (await response.json()) as NotificationSummary;
      if (didSummaryChange(summaryRef.current, nextSummary)) {
        summaryRef.current = nextSummary;
        router.refresh();
      }
    } catch {
      // Keep the current server-rendered list when polling fails.
    }
  }, [router]);

  useEffect(() => {
    summaryRef.current = initialSummary;
  }, [initialSummary]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void pollSummary();
    }, 30000);
    const pollWhenVisible = () => {
      void pollSummary();
    };

    window.addEventListener("focus", pollWhenVisible);
    document.addEventListener("visibilitychange", pollWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", pollWhenVisible);
      document.removeEventListener("visibilitychange", pollWhenVisible);
    };
  }, [pollSummary]);

  return null;
}
