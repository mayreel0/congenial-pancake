"use client";

import { useEffect, useState } from "react";
import { Toggle } from "ui/Toggle";
import { toast } from "ui/useToast";
import { ApiError, errorMessage } from "../../lib/api";
import {
  disablePushNotifications,
  enablePushNotifications,
  getOwnPushSubscription,
  pushSupported,
} from "../../lib/notifications/push";

// enablePushNotifications/disablePushNotifications throw a plain Error for
// browser/permission-level failures (no useful ApiError code to look up)
// and let a real backend ApiError through as-is — errorMessage() only
// recognizes the latter, so a plain Error needs its own message read
// directly rather than falling back to a generic "something went wrong".
function pushErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return errorMessage(error);
  if (error instanceof Error) return error.message;
  return "알림을 설정하지 못했어요.";
}

// Support/existing-subscription state only exists in the browser, so it's
// read after mount rather than on the server render — null (not yet
// checked) renders nothing, same pattern SettingsPageContent uses for its
// localStorage-backed settings. A browser without support (or missing the
// VAPID env var, e.g. local dev without it configured) just never shows
// this card, rather than showing a disabled toggle with no explanation.
export function PushSubscriptionToggle() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  // A synchronous read (not a subscription), so it's safe as a lazy
  // initializer rather than a setState-in-effect — this only runs once,
  // on mount, same as any other useState(() => ...) initializer.
  const [denied, setDenied] = useState<boolean>(
    () => typeof Notification !== "undefined" && Notification.permission === "denied",
  );

  useEffect(() => {
    if (!pushSupported()) return;
    getOwnPushSubscription()
      .then((subscription) => setSubscribed(subscription !== null))
      .catch(() => setSubscribed(false));
  }, []);

  async function handleChange(checked: boolean) {
    setPending(true);
    try {
      if (checked) {
        await enablePushNotifications();
      } else {
        await disablePushNotifications();
      }
      setSubscribed(checked);
      setDenied(false);
    } catch (error) {
      setDenied(Notification.permission === "denied");
      toast.warning(pushErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (!pushSupported() || subscribed === null) return null;

  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">푸시 알림</h2>
      <Toggle
        checked={subscribed}
        disabled={pending}
        label="답장이 오면 알림 받기"
        onChange={(checked) => void handleChange(checked)}
      />
      <p className="text-xs text-muted">
        브라우저 알림 권한이 필요해요. 알림에는 &ldquo;답장이
        도착했어요&rdquo;라는 문구만 담기고, 답장 내용은 들어가지 않아요.
      </p>
      {denied && (
        <p className="text-xs text-amber-600">
          브라우저 설정에서 온설 알림이 차단되어 있어요. 브라우저의 사이트
          설정에서 알림을 허용으로 바꾼 뒤 다시 시도해주세요.
        </p>
      )}
    </section>
  );
}
