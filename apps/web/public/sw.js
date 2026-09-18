// Intentionally minimal — registering a service worker with a fetch
// handler is (still, on some browsers) part of Chrome's PWA install
// criteria, but this app's content changes daily (오늘/답변/읽기 feeds),
// so caching responses here would risk serving stale data. Offline
// support is a separate, real design decision (what to cache, how to
// invalidate) that hasn't been made yet — this stays a passthrough until
// it has.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op — falls through to the network exactly as if there were no
  // service worker at all.
});
