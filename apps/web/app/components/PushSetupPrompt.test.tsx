import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "../lib/test-utils";
import { PushSetupPrompt } from "./PushSetupPrompt";

const useAuth = vi.fn();
vi.mock("../lib/auth/useAuth", () => ({ useAuth: () => useAuth() }));

const isStandaloneApp = vi.fn();
const pushSupported = vi.fn();
const getOwnPushSubscription = vi.fn();
const enablePushNotifications = vi.fn();
vi.mock("../lib/notifications/push", () => ({
  isStandaloneApp: () => isStandaloneApp(),
  pushSupported: () => pushSupported(),
  getOwnPushSubscription: () => getOwnPushSubscription(),
  enablePushNotifications: () => enablePushNotifications(),
  pushErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "실패",
}));

const QUESTION = /답장이 오면 알려드릴까요/;

describe("PushSetupPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuth.mockReturnValue({ status: "authenticated" });
    isStandaloneApp.mockReturnValue(true);
    pushSupported.mockReturnValue(true);
    getOwnPushSubscription.mockResolvedValue(null);
    enablePushNotifications.mockResolvedValue(undefined);
    vi.stubGlobal("Notification", { permission: "default" });
  });

  it("asks once in the installed app after login", async () => {
    render(<PushSetupPrompt />);

    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
  });

  it("does not ask in a browser tab", async () => {
    isStandaloneApp.mockReturnValue(false);
    render(<PushSetupPrompt />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
  });

  it("does not ask while logged out, then asks once logged in", async () => {
    useAuth.mockReturnValue({ status: "anonymous" });
    const { rerender } = render(<PushSetupPrompt />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();

    useAuth.mockReturnValue({ status: "authenticated" });
    rerender(<PushSetupPrompt />);

    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
  });

  it("does not ask again once answered on this device", async () => {
    localStorage.setItem("onseol.pushPrompted", "1");
    render(<PushSetupPrompt />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
  });

  it("does not ask when the account already has a subscription or permission is blocked", async () => {
    getOwnPushSubscription.mockResolvedValue({ endpoint: "x" });
    const { unmount } = render(<PushSetupPrompt />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    unmount();

    getOwnPushSubscription.mockResolvedValue(null);
    vi.stubGlobal("Notification", { permission: "denied" });
    render(<PushSetupPrompt />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
  });

  it("'나중에' closes it and remembers, without enabling push", async () => {
    render(<PushSetupPrompt />);
    fireEvent.click(await screen.findByRole("button", { name: "나중에" }));

    await waitFor(() =>
      expect(screen.queryByText(QUESTION)).not.toBeInTheDocument(),
    );
    expect(enablePushNotifications).not.toHaveBeenCalled();
    expect(localStorage.getItem("onseol.pushPrompted")).toBe("1");
  });

  it("'켜기' enables push and remembers", async () => {
    render(<PushSetupPrompt />);
    fireEvent.click(await screen.findByRole("button", { name: "켜기" }));

    await waitFor(() => expect(enablePushNotifications).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByText(QUESTION)).not.toBeInTheDocument(),
    );
    expect(localStorage.getItem("onseol.pushPrompted")).toBe("1");
  });

  it("shows the failure, stays open and doesn't use up the ask when enabling fails", async () => {
    enablePushNotifications.mockRejectedValue(new Error("알림 권한이 필요해요."));
    render(<PushSetupPrompt />);
    fireEvent.click(await screen.findByRole("button", { name: "켜기" }));

    expect(await screen.findByText("알림 권한이 필요해요.")).toBeInTheDocument();
    expect(screen.getByText(QUESTION)).toBeInTheDocument();
    expect(localStorage.getItem("onseol.pushPrompted")).toBeNull();
  });

  it("is labelled for assistive tech", async () => {
    render(<PushSetupPrompt />);

    expect(
      await screen.findByRole("dialog", { name: "알림 설정 안내" }),
    ).toBeInTheDocument();
  });
});
