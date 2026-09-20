"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { isStandaloneApp } from "../../lib/standalone-app";
import { IosInstallGuide } from "./IosInstallGuide";

// Chromium-only, not in lib.dom — fired when the browser decides the site is
// installable, and only until it's installed.
type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function subscribe(): () => void {
  return () => {};
}

// iPadOS reports itself as a Mac, hence the touch-points check.
function isIos(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// Read through useSyncExternalStore (server snapshot false) rather than a
// lazy useState: this renders on the server too, and a client-only answer on
// the first render would mismatch the server HTML.
function useIos(): boolean {
  return useSyncExternalStore(subscribe, isIos, () => false);
}

function useStandalone(): boolean {
  return useSyncExternalStore(subscribe, isStandaloneApp, () => false);
}

// Web-only entry to the installed app. Where the browser can prompt
// (Chromium) it does; iOS gets a how-to instead; anywhere it can't install —
// or already has — the button just isn't shown.
export function InstallAppButton() {
  const ios = useIos();
  const standalone = useStandalone();
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    function handleInstalled() {
      setInstallEvent(null);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const closeGuide = useCallback(() => setGuideOpen(false), []);

  async function handleClick() {
    if (installEvent) {
      // A prompt event can only be used once, whichever way it ended —
      // including prompt() itself rejecting (expired user gesture etc.).
      await installEvent.prompt().catch(() => undefined);
      setInstallEvent(null);
      return;
    }
    setGuideOpen(true);
  }

  if (standalone || (!installEvent && !ios)) return null;

  return (
    <>
      <button
        className="inline-flex h-12 items-center justify-center rounded-lg border border-line bg-surface px-5 text-sm font-semibold text-foreground whitespace-nowrap transition hover:bg-surface-muted"
        type="button"
        onClick={() => void handleClick()}
      >
        앱으로 이용하기
      </button>
      <IosInstallGuide open={guideOpen} onClose={closeGuide} />
    </>
  );
}
