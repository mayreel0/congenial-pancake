import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMyPushEndpoints = vi.fn();
const unsubscribeFromPushNotifications = vi.fn();
vi.mock("./api", () => ({
  fetchMyPushEndpoints: () => fetchMyPushEndpoints(),
  subscribeToPushNotifications: vi.fn(),
  unsubscribeFromPushNotifications: (endpoint: string) =>
    unsubscribeFromPushNotifications(endpoint),
}));

function installBrowserSubscription(endpoint: string | null) {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  const subscription = endpoint ? { endpoint, unsubscribe } : null;
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: { getSubscription: () => Promise.resolve(subscription) },
      }),
    },
  });
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", class {});
  return unsubscribe;
}

// VAPID key is read once at module load, so each test needs a fresh import
// after the env var is stubbed.
async function loadPush() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "test-key");
  return import("./push");
}

describe("push subscription account binding", () => {
  beforeEach(() => {
    fetchMyPushEndpoints.mockReset();
    unsubscribeFromPushNotifications.mockReset();
    unsubscribeFromPushNotifications.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("treats a browser subscription owned by another account as absent", async () => {
    installBrowserSubscription("https://push.example.com/other");
    fetchMyPushEndpoints.mockResolvedValue({
      endpoints: ["https://push.example.com/mine"],
    });
    const { getOwnPushSubscription } = await loadPush();

    await expect(getOwnPushSubscription()).resolves.toBeNull();
  });

  it("returns the browser subscription when the current account owns it", async () => {
    installBrowserSubscription("https://push.example.com/mine");
    fetchMyPushEndpoints.mockResolvedValue({
      endpoints: ["https://push.example.com/mine"],
    });
    const { getOwnPushSubscription } = await loadPush();

    const subscription = await getOwnPushSubscription();
    expect(subscription?.endpoint).toBe("https://push.example.com/mine");
  });

  it("does not touch another account's subscription when disabling", async () => {
    const unsubscribe = installBrowserSubscription(
      "https://push.example.com/other",
    );
    fetchMyPushEndpoints.mockResolvedValue({ endpoints: [] });
    const { disablePushNotifications } = await loadPush();

    await disablePushNotifications();

    expect(unsubscribeFromPushNotifications).not.toHaveBeenCalled();
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("removes the server row and the browser subscription for its own", async () => {
    const unsubscribe = installBrowserSubscription(
      "https://push.example.com/mine",
    );
    fetchMyPushEndpoints.mockResolvedValue({
      endpoints: ["https://push.example.com/mine"],
    });
    const { disablePushNotifications } = await loadPush();

    await disablePushNotifications();

    expect(unsubscribeFromPushNotifications).toHaveBeenCalledWith(
      "https://push.example.com/mine",
    );
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("never rejects on logout even when the backend lookup fails", async () => {
    installBrowserSubscription("https://push.example.com/mine");
    fetchMyPushEndpoints.mockRejectedValue(new Error("network"));
    const { releasePushOnLogout } = await loadPush();

    await expect(releasePushOnLogout()).resolves.toBeUndefined();
  });
});
