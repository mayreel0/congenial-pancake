"use client";

import { useEffect } from "react";

// Registers public/sw.js — needed for install eligibility and as the
// future home for web push's event listener. Renders nothing; mounted
// once in the root layout, same pattern as AccountRestoreDialog.
//
// Registers after the window "load" event (not immediately on mount) so
// it doesn't compete with the page's own critical-resource loading.
// Deliberately NOT gated to production only — registering in `pnpm dev`
// too is what let local install-eligibility testing work at all (used
// directly to verify this feature before it shipped); gating it would
// remove that without a demonstrated HMR/Fast Refresh problem to justify
// the tradeoff.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function register() {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        // Installability is a progressive enhancement — an unsupported
        // browser or a failed registration shouldn't surface an error to
        // the user, the site works fine without it either way. Still
        // worth a console trace for debugging a real deploy issue
        // (wrong scope, non-HTTPS, etc.).
        console.warn("Service worker registration failed:", error);
      });
    }

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
