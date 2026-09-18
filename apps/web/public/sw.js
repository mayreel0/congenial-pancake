// Intentionally minimal — just registered and controlling, no fetch
// handler. A no-op "fetch" listener isn't free: every network request
// the page makes (API calls, chunks, images, 온설's /notifications/stream
// SSE connection) would round-trip through the SW thread for nothing,
// and it's not required for installability on current Chromium anyway.
// This app's content changes daily (오늘/답변/읽기 feeds), so caching
// responses here would risk serving stale data — offline support is a
// separate, real design decision (what to cache, how to invalidate) that
// hasn't been made yet. Once web push ships, this file gains "push"/
// "notificationclick" listeners, still no "fetch".
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
