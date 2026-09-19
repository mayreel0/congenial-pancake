"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOwnPushSubscription, pushSupported } from "../lib/notifications/push";

// Read-only — the switch itself lives in /settings (app only); this just
// tells the viewer where push stands from the list they'd wonder about it
// on, and where to change it. Renders nothing until the check finishes or on
// a browser that can't do push, so it never claims a state it hasn't verified.
export function PushStatusNotice() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!pushSupported()) return;
    getOwnPushSubscription()
      .then((subscription) => setEnabled(subscription !== null))
      .catch(() => setEnabled(null));
  }, []);

  if (enabled === null) return null;

  return (
    <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted shadow-sm">
      푸시 알림이{" "}
      <span className="font-semibold text-foreground">
        {enabled ? "켜져 있어요" : "꺼져 있어요"}
      </span>
      . 켜고 끄는 건 앱의{" "}
      <Link
        className="text-foreground underline underline-offset-2"
        href="/settings"
      >
        설정
      </Link>
      에서 할 수 있어요.
    </p>
  );
}
