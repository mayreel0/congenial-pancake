import { useSyncExternalStore } from "react";
import type { OAuthProviderName } from "../../lib/api";

const STORAGE_KEY = "onseol:lastOAuthProvider";

function getLastOAuthProvider(): OAuthProviderName | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "google" || value === "kakao" || value === "naver" ? value : null;
  } catch {
    return null;
  }
}

export function setLastOAuthProvider(provider: OAuthProviderName): void {
  try {
    localStorage.setItem(STORAGE_KEY, provider);
  } catch {
    // Private browsing / storage disabled — this only drives a convenience
    // hint, so failing to persist it is safe to ignore.
  }
}

// No storage event listener needed: the only writer is this same tab's own
// click handler, and the `storage` event never fires for writes made by the
// document that's listening for it.
function subscribe(): () => void {
  return () => {};
}

function getServerSnapshot(): null {
  return null;
}

export function useLastOAuthProvider(): OAuthProviderName | null {
  return useSyncExternalStore(subscribe, getLastOAuthProvider, getServerSnapshot);
}
