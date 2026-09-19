"use client";

import { useEffect, useState } from "react";
import { Toggle } from "ui/Toggle";
import { toast } from "ui/useToast";
import {
  disablePushNotifications,
  enablePushNotifications,
  getOwnPushSubscription,
  isStandaloneApp,
  pushConfigured,
  pushErrorMessage,
  pushSupported,
} from "../../lib/notifications/push";
import { PushAppOnlyNotice } from "./PushAppOnlyNotice";

// Support/existing-subscription state only exists in the browser, so it's
// read after mount rather than on the server render — null (not yet
// checked) renders nothing, same pattern SettingsPageContent uses for its
// localStorage-backed settings. Turning push on/off is only offered from the
// installed app; a browser tab gets PushAppOnlyNotice instead (which still
// reflects an already-on subscription, e.g. one made before this rule).
// A deployment without the VAPID key never shows either card.
export function PushSubscriptionToggle() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [standalone] = useState(isStandaloneApp);
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

  if (!pushConfigured()) return null;
  if (!standalone) return <PushAppOnlyNotice subscribed={subscribed === true} />;
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
