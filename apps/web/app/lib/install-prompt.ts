"use client";

import { useSyncExternalStore } from "react";
import { APP_INSTALLED_KEY, INSTALL_PROMPT_EVENT } from "./install-prompt-script";

// Chromium-only, not in lib.dom.
export type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __onseolInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(INSTALL_PROMPT_EVENT, onChange);
  return () => window.removeEventListener(INSTALL_PROMPT_EVENT, onChange);
}

// Server snapshots are null/false: this renders on the server too, and a
// client-only answer on the first render would mismatch the server HTML.
export function useInstallPromptEvent(): BeforeInstallPromptEvent | null {
  return useSyncExternalStore(
    subscribe,
    () => window.__onseolInstallPrompt ?? null,
    () => null,
  );
}

function readInstalledFlag(): boolean {
  try {
    return localStorage.getItem(APP_INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function useAppInstalledFlag(): boolean {
  return useSyncExternalStore(subscribe, readInstalledFlag, () => false);
}

// A prompt event can only be used once, whichever way the choice went.
export function consumeInstallPrompt(): void {
  window.__onseolInstallPrompt = null;
  window.dispatchEvent(new Event(INSTALL_PROMPT_EVENT));
}
