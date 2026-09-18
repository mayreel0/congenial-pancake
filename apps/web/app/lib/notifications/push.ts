"use client";

import type { CreatePushSubscriptionDto } from "shared/dto";
import {
  fetchMyPushEndpoints,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "./api";

// Same value as apps/api-server's VAPID_PUBLIC_KEY — see that env schema's
// comment. Must come from a real generated pair for subscribe() to work;
// an empty string just makes pushSupported() report false everywhere.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

// PushManager.subscribe() wants the VAPID public key as a Uint8Array, but
// it's carried everywhere else (env vars, web-push's generateVAPIDKeys())
// as the URL-safe base64 string — this is MDN's documented conversion.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

// PushSubscription.toJSON()'s TS type marks endpoint/keys optional (it
// mirrors the general PushSubscriptionJSON spec shape), but a subscription
// that just came back from a successful pushManager.subscribe() call
// always has both — this just turns that runtime guarantee into the
// narrower shape the backend's schema actually expects.
function toSubscriptionPayload(
  subscription: PushSubscription,
): CreatePushSubscriptionDto {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("구독 정보를 읽지 못했어요.");
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

async function getBrowserPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// A browser holds one push subscription per origin no matter which account
// is logged in, so "the browser has a subscription" says nothing about
// whether it belongs to the *current* account — it may be left over from
// whoever used this device before. Only a subscription whose endpoint the
// backend lists under the caller's own account counts; anything else is
// treated as absent so it's never shown as "on" for, or torn down by, the
// wrong account.
export async function getOwnPushSubscription(): Promise<PushSubscription | null> {
  const subscription = await getBrowserPushSubscription();
  if (!subscription) return null;
  const { endpoints } = await fetchMyPushEndpoints();
  return endpoints.includes(subscription.endpoint) ? subscription : null;
}

// Triggers the browser's native permission prompt when permission hasn't
// been decided yet (a one-time, per-origin OS-level UI this app has no
// control over). Throws a plain Error — not ApiError — for every failure
// up through the subscribe() call itself, so callers can tell "browser/
// permission problem" apart from a real backend ApiError on the follow-up
// registration call.
export async function enablePushNotifications(): Promise<void> {
  if (!pushSupported()) {
    throw new Error("이 브라우저에서는 푸시 알림을 지원하지 않아요.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      "알림 권한이 필요해요. 브라우저 설정에서 알림을 허용해주세요.",
    );
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  try {
    await subscribeToPushNotifications(toSubscriptionPayload(subscription));
  } catch (error) {
    // Without this, a failed registration call (network blip, expired
    // session) leaves a live browser-side subscription the backend never
    // heard about — getExistingPushSubscription() would then report
    // "subscribed" on next load while no push ever arrives. Roll the
    // browser side back too so retrying the toggle starts from a clean
    // state on both sides.
    await subscription.unsubscribe().catch(() => undefined);
    throw error;
  }
}

// Backend delete first, then the browser-side unsubscribe — if the
// network call fails, the toggle can just be retried with nothing torn
// down locally in the meantime.
export async function disablePushNotifications(): Promise<void> {
  const subscription = await getOwnPushSubscription();
  if (!subscription) return;
  await unsubscribeFromPushNotifications(subscription.endpoint);
  await subscription.unsubscribe();
}

// Called right before logout so this device stops receiving the departing
// account's pushes (and the next account to log in here starts from a clean
// slate). Best-effort — a failure here must never block logging out.
//
// Unlike disablePushNotifications, the local unsubscribe here must not depend
// on the ownership lookup succeeding: if that request fails (network blip,
// expired session), the device would otherwise keep ringing for an account
// that's no longer logged in. A lookup that *succeeds* and says the
// subscription belongs to someone else is still respected and left alone;
// only "couldn't tell" falls back to dropping it, since wrongly dropping is
// recoverable (re-toggle) while a leaked notification is not.
export async function releasePushOnLogout(): Promise<void> {
  try {
    const subscription = await getBrowserPushSubscription();
    if (!subscription) return;

    let ownedByOtherAccount = false;
    try {
      const { endpoints } = await fetchMyPushEndpoints();
      ownedByOtherAccount = !endpoints.includes(subscription.endpoint);
    } catch {
      // Ownership unknown — treat as ours and release below.
    }
    if (ownedByOtherAccount) return;

    await unsubscribeFromPushNotifications(subscription.endpoint).catch(
      () => undefined,
    );
    await subscription.unsubscribe();
  } catch {
    // Logout proceeds regardless.
  }
}
