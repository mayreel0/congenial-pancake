import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_SETTINGS,
  applyThemePreference,
  loadSiteSettings,
  saveSiteSettings,
} from "./site-settings";

describe("site-settings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("returns defaults when nothing is saved yet", () => {
    expect(loadSiteSettings()).toEqual(DEFAULT_SITE_SETTINGS);
  });

  it("round-trips a saved partial through defaults", () => {
    saveSiteSettings({
      ...DEFAULT_SITE_SETTINGS,
      theme: "dark",
      reduceMotion: true,
    });

    expect(loadSiteSettings()).toEqual({
      ...DEFAULT_SITE_SETTINGS,
      theme: "dark",
      reduceMotion: true,
    });
  });

  it("falls back to defaults if the stored value is corrupted", () => {
    window.localStorage.setItem("onseol:site-settings", "{not json");
    expect(loadSiteSettings()).toEqual(DEFAULT_SITE_SETTINGS);
  });

  it("applyThemePreference sets data-theme for light/dark and clears it for system", () => {
    applyThemePreference("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");

    applyThemePreference("light");
    expect(document.documentElement.dataset.theme).toBe("light");

    applyThemePreference("system");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
