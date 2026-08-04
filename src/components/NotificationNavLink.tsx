"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type NotificationSummaryResponse = {
  unreadCount: number;
};

type NotificationNavLinkProps = {
  initialUnreadCount: number;
};

export default function NotificationNavLink({ initialUnreadCount }: NotificationNavLinkProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  const pollSummary = useCallback(async () => {
    if (document.visibilityState !== "visible") return;

    try {
      const response = await fetch("/api/notifications/summary", { cache: "no-store" });
      if (!response.ok) return;

      const summary = (await response.json()) as NotificationSummaryResponse;
      setUnreadCount(summary.unreadCount);
    } catch {
      // Keep the last known count when polling fails.
    }
  }, []);

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

  return (
    <Link href="/notifications">
      알림{unreadCount > 0 ? ` ${unreadCount}` : ""}
    </Link>
  );
}
