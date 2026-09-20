import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "../../lib/test-utils";
import { InstallAppButton } from "./InstallAppButton";

const isStandaloneApp = vi.fn();
vi.mock("../../lib/standalone-app", () => ({
  isStandaloneApp: () => isStandaloneApp(),
}));

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1";

// Stands in for what INSTALL_PROMPT_SCRIPT does when the browser offers the
// prompt (that script has its own test).
function offerInstallPrompt(prompt: () => Promise<void>) {
  window.__onseolInstallPrompt = Object.assign(new Event("beforeinstallprompt"), {
    prompt,
    userChoice: Promise.resolve({ outcome: "accepted" as const }),
  });
  act(() => {
    window.dispatchEvent(new Event("onseol:installprompt"));
  });
}

describe("InstallAppButton", () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    isStandaloneApp.mockReturnValue(false);
    localStorage.clear();
  });

  afterEach(() => {
    window.__onseolInstallPrompt = null;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
  });

  it("shows in any browser tab and explains the menu route when there's no install prompt", async () => {
    render(<InstallAppButton />);

    fireEvent.click(await screen.findByRole("button", { name: "앱으로 이용하기" }));

    expect(
      await screen.findByRole("dialog", { name: "앱으로 설치하는 방법" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/앱 설치/, { selector: "li" })).toBeInTheDocument();
  });

  it("opens the browser's install prompt when one was offered, even before this rendered", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    window.__onseolInstallPrompt = Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    render(<InstallAppButton />);

    fireEvent.click(await screen.findByRole("button", { name: "앱으로 이용하기" }));

    expect(prompt).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(window.__onseolInstallPrompt).toBeNull());
  });

  it("picks up a prompt offered after it rendered", async () => {
    render(<InstallAppButton />);
    const prompt = vi.fn().mockResolvedValue(undefined);
    offerInstallPrompt(prompt);

    fireEvent.click(await screen.findByRole("button", { name: "앱으로 이용하기" }));

    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it("drops the spent prompt even when prompt() rejects", async () => {
    render(<InstallAppButton />);
    offerInstallPrompt(vi.fn().mockRejectedValue(new DOMException("expired")));

    fireEvent.click(await screen.findByRole("button", { name: "앱으로 이용하기" }));

    await vi.waitFor(() => expect(window.__onseolInstallPrompt).toBeNull());
  });

  it("is hidden once the app is known to be installed", () => {
    localStorage.setItem("onseol.appInstalled", "1");
    render(<InstallAppButton />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hides when the app gets installed while the page is open", async () => {
    render(<InstallAppButton />);
    await screen.findByRole("button", { name: "앱으로 이용하기" });

    localStorage.setItem("onseol.appInstalled", "1");
    act(() => {
      window.dispatchEvent(new Event("onseol:installprompt"));
    });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("walks through the share sheet on iOS", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: IOS_UA,
    });
    render(<InstallAppButton />);

    fireEvent.click(await screen.findByRole("button", { name: "앱으로 이용하기" }));

    expect(
      await screen.findByRole("dialog", { name: "앱으로 설치하는 방법" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/공유 버튼/, { selector: "li" })).toBeInTheDocument();
  });

  it("closes the how-to with Escape or a tap outside it", async () => {
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

  it("never shows in the installed app", () => {
    isStandaloneApp.mockReturnValue(true);
    render(<InstallAppButton />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
