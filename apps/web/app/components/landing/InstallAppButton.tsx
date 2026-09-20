"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  consumeInstallPrompt,
  useAppInstalledFlag,
  useInstallPromptEvent,
} from "../../lib/install-prompt";
import { isStandaloneApp } from "../../lib/standalone-app";
import { InstallGuide } from "./InstallGuide";

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

// Web-only entry to the installed app, shown in any browser tab that isn't
// already the app. With a browser-offered install prompt (Chromium) it opens
// that; otherwise it explains the menu route. Hidden once installed — the
// browser stops offering the prompt then, which the "installed" flag
// (install-prompt-script.ts) is what tells apart from "never offered".
export function InstallAppButton() {
  const ios = useIos();
  const standalone = useStandalone();
  const installEvent = useInstallPromptEvent();
  const installed = useAppInstalledFlag();
  const [guideOpen, setGuideOpen] = useState(false);
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  async function handleClick() {
    if (installEvent) {
      // prompt() can reject (expired user gesture etc.); the event is spent
      // either way.
      await installEvent.prompt().catch(() => undefined);
      consumeInstallPrompt();
      return;
    }
    setGuideOpen(true);
  }

  if (standalone || installed) return null;

  return (
    <>
      <button
        className="inline-flex h-12 items-center justify-center rounded-lg border border-line bg-surface px-5 text-sm font-semibold text-foreground whitespace-nowrap transition hover:bg-surface-muted"
        type="button"
        onClick={() => void handleClick()}
      >
        앱으로 이용하기
      </button>
      <InstallGuide
        open={guideOpen}
        variant={ios ? "ios" : "other"}
        onClose={closeGuide}
      />
    </>
  );
}
