// Intentionally minimal — just registered and controlling, plus push
// handling below. No fetch handler: a no-op "fetch" listener isn't free,
// every network request the page makes (API calls, chunks, images,
// 온설's /notifications/stream SSE connection) would round-trip through
// the SW thread for nothing, and it's not required for installability on
// current Chromium anyway. This app's content changes daily (오늘/답변/읽기
// 피드), so caching responses here would risk serving stale data —
// offline support is a separate, real design decision (what to cache,
// how to invalidate) that hasn't been made yet.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Payload is always { title, body, url } — WebPushService (apps/api-server)
// deliberately sends generic text only, never reply content, matching this
// app's anonymity design (see NotificationsService.createReplyReceived). A
// malformed payload (not JSON) would otherwise throw synchronously out of
// this handler and crash it — Chromium then shows its own forced fallback
// notification ("This site has been updated in the background") instead
// of the one below, so this is worth catching even though the payload is
// normally ours.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "온설", {
      body: data.body || "",
      icon: "/icon-192.png",
      data: { url: data.url },
    }),
  );
});

// event.notification.data.url ultimately comes from a push payload —
// always built server-side from WEB_PUBLIC_URL, but treated as untrusted
// input here anyway rather than trusting it to open whatever shows up.
function sameOriginUrl(url) {
  try {
    const parsed = new URL(url, self.location.origin);
    return parsed.origin === self.location.origin ? parsed.href : null;
  } catch {
    return null;
  }
}

// Reuses an already-open 온설 tab instead of always opening a new one —
// exact match focuses as-is; a same-origin tab on some other page gets
// focused and navigated; only with no 온설 tab open at all does this fall
// back to opening a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data && event.notification.data.url;
  const url = rawUrl && sameOriginUrl(rawUrl);
  if (!url) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) return client.focus();
        }
        const existing = clientList.find(
          (client) =>
            client.url.startsWith(self.location.origin) && "focus" in client,
        );
        if (existing && "navigate" in existing) {
          return existing.focus().then(() => existing.navigate(url));
        }
        return self.clients.openWindow(url);
      }),
  );
});
