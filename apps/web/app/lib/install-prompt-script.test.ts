import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { INSTALL_PROMPT_SCRIPT } from "./install-prompt-script";

function runScript() {
  new Function(INSTALL_PROMPT_SCRIPT)();
}

describe("INSTALL_PROMPT_SCRIPT", () => {
  beforeAll(() => {
    runScript();
  });

  afterEach(() => {
    window.__onseolInstallPrompt = null;
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("stashes the browser's install prompt for later and stops the default banner", () => {
    const listener = vi.fn();
    window.addEventListener("onseol:installprompt", listener);
    const event = new Event("beforeinstallprompt", { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(window.__onseolInstallPrompt).toBe(event);
    expect(listener).toHaveBeenCalled();
    window.removeEventListener("onseol:installprompt", listener);
  });

  it("marks the app installed and drops the prompt on appinstalled", () => {
    window.dispatchEvent(new Event("beforeinstallprompt", { cancelable: true }));

    window.dispatchEvent(new Event("appinstalled"));

    expect(window.__onseolInstallPrompt).toBeNull();
    expect(localStorage.getItem("onseol.appInstalled")).toBe("1");
  });

  it("clears the installed flag when the browser offers the prompt again (e.g. after an uninstall)", () => {
    localStorage.setItem("onseol.appInstalled", "1");

    window.dispatchEvent(new Event("beforeinstallprompt", { cancelable: true }));

    expect(localStorage.getItem("onseol.appInstalled")).toBeNull();
  });

  it("marks the app installed when the site is running as the installed app", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(display-mode: standalone)",
      })),
    );

    runScript();

    expect(localStorage.getItem("onseol.appInstalled")).toBe("1");
  });
});
