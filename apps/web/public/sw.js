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
// app's anonymity design (see NotificationsService.createReplyReceived).
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "온설", {
      body: data.body || "",
      icon: "/icon-192.png",
      data: { url: data.url },
    }),
  );
});

// Reuses an already-open 온설 tab (focusing it) instead of always opening a
// new one — most users who get a push already have the site open in some
// tab.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (!url) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
