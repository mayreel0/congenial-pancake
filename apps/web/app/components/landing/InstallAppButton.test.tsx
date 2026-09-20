import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "../../lib/test-utils";
import { InstallAppButton } from "./InstallAppButton";

const isStandaloneApp = vi.fn();
vi.mock("../../lib/standalone-app", () => ({
  isStandaloneApp: () => isStandaloneApp(),
}));

function fireInstallPrompt() {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: "accepted" as const }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return { prompt, event };
}

describe("InstallAppButton", () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    isStandaloneApp.mockReturnValue(false);
  });

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
  });

  it("shows nothing where the browser can't install", () => {
    render(<InstallAppButton />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens the browser's install prompt once it offers one", async () => {
    render(<InstallAppButton />);
    const { prompt, event } = fireInstallPrompt();

    expect(event.defaultPrevented).toBe(true);
    fireEvent.click(await screen.findByRole("button", { name: "앱으로 이용하기" }));

    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it("hides again after the prompt has been used", async () => {
    render(<InstallAppButton />);
    fireInstallPrompt();
    fireEvent.click(await screen.findByRole("button", { name: "앱으로 이용하기" }));

    await vi.waitFor(() =>
      expect(screen.queryByRole("button", { name: "앱으로 이용하기" })).not.toBeInTheDocument(),
    );
  });

  it("recovers when the prompt itself rejects", async () => {
    render(<InstallAppButton />);
    const prompt = vi.fn().mockRejectedValue(new DOMException("expired"));
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: "dismissed" as const }),
    });
    act(() => {
      window.dispatchEvent(event);
    });

    fireEvent.click(await screen.findByRole("button", { name: "앱으로 이용하기" }));

    await vi.waitFor(() =>
      expect(screen.queryByRole("button", { name: "앱으로 이용하기" })).not.toBeInTheDocument(),
    );
  });

  it("hides once the app is installed", async () => {
    render(<InstallAppButton />);
    fireInstallPrompt();
    await screen.findByRole("button", { name: "앱으로 이용하기" });

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a how-to on iOS, where there's no install prompt", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
    });
    render(<InstallAppButton />);

    fireEvent.click(await screen.findByRole("button", { name: "앱으로 이용하기" }));

    expect(
      await screen.findByRole("dialog", { name: "앱으로 설치하는 방법" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/홈 화면에 추가/, { selector: "li" })).toBeInTheDocument();
  });

  it("closes the iOS how-to with Escape or a tap outside it", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
    });
    render(<InstallAppButton />);

    fireEvent.click(await screen.findByRole("button", { name: "앱으로 이용하기" }));
    await screen.findByRole("dialog", { name: "앱으로 설치하는 방법" });
    fireEvent.keyDown(document, { key: "Escape" });
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "앱으로 이용하기" }));
    await screen.findByRole("dialog", { name: "앱으로 설치하는 방법" });
    fireEvent.mouseDown(document.body);
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("never shows in the installed app", async () => {
    isStandaloneApp.mockReturnValue(true);
    render(<InstallAppButton />);
    fireInstallPrompt();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
