import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "../../lib/test-utils";
import { PushSubscriptionToggle } from "./PushSubscriptionToggle";

const isStandaloneApp = vi.fn();
const pushConfigured = vi.fn();
const pushSupported = vi.fn();
const getOwnPushSubscription = vi.fn();
vi.mock("../../lib/standalone-app", () => ({
  isStandaloneApp: () => isStandaloneApp(),
}));
vi.mock("../../lib/notifications/push", () => ({
  pushConfigured: () => pushConfigured(),
  pushSupported: () => pushSupported(),
  getOwnPushSubscription: () => getOwnPushSubscription(),
  enablePushNotifications: vi.fn(),
  disablePushNotifications: vi.fn(),
  pushErrorMessage: () => "실패",
}));

describe("PushSubscriptionToggle", () => {
  beforeEach(() => {
    isStandaloneApp.mockReturnValue(true);
    pushConfigured.mockReturnValue(true);
    pushSupported.mockReturnValue(true);
    getOwnPushSubscription.mockResolvedValue(null);
    vi.stubGlobal("Notification", { permission: "default" });
  });

  it("offers the switch in the installed app", async () => {
    render(<PushSubscriptionToggle />);

    expect(
      await screen.findByRole("switch", { name: "답장이 오면 알림 받기" }),
    ).toBeInTheDocument();
  });

  it("shows an app-only notice instead of the switch in a browser tab", async () => {
    isStandaloneApp.mockReturnValue(false);
    render(<PushSubscriptionToggle />);

    expect(
      await screen.findByText(/앱으로 설치해서 이용할 때 켜고 끌 수 있어요/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("says it's already on, without a switch, for a subscription made in a browser tab", async () => {
    isStandaloneApp.mockReturnValue(false);
    getOwnPushSubscription.mockResolvedValue({ endpoint: "x" });
    render(<PushSubscriptionToggle />);

    expect(await screen.findByText(/지금은 켜져 있어요/)).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("shows nothing when push isn't configured for this deployment", async () => {
    pushConfigured.mockReturnValue(false);
    const { container } = render(<PushSubscriptionToggle />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
