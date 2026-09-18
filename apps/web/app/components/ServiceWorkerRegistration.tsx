"use client";

import { useEffect } from "react";

// Registers public/sw.js — needed for install eligibility (Chrome/Android
// still check for a registered service worker with a fetch handler) and
// as the future home for web push's event listener. Renders nothing;
// mounted once in the root layout, same pattern as AccountRestoreDialog.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement — an unsupported
      // browser or a failed registration shouldn't surface an error to
      // the user, the site works fine without it either way.
    });
  }, []);

  return null;
}
