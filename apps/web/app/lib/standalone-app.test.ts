import { afterEach, describe, expect, it, vi } from "vitest";
import { isStandaloneApp } from "./standalone-app";

describe("isStandaloneApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "standalone");
  });

  function stubDisplayMode(standalone: boolean) {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: standalone && query === "(display-mode: standalone)",
      })),
    );
  }

  it("is false in a plain browser tab", () => {
    stubDisplayMode(false);

    expect(isStandaloneApp()).toBe(false);
  });

  it("is true when launched with display-mode: standalone", () => {
    stubDisplayMode(true);

    expect(isStandaloneApp()).toBe(true);
  });

  it("ignores navigator.standalone when display-mode says it's a browser tab (iOS Safari reports it true there)", () => {
    stubDisplayMode(false);
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });

    expect(isStandaloneApp()).toBe(false);
  });

  it("falls back to navigator.standalone only where matchMedia doesn't exist", () => {
    vi.stubGlobal("matchMedia", undefined);
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });

    expect(isStandaloneApp()).toBe(true);
  });
});
