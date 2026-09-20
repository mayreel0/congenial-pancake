import { describe, expect, it } from "vitest";
import { APP_ENTRY_PATH } from "./lib/app-entry";
import manifest from "./manifest";

describe("manifest", () => {
  it("starts the installed app at the login-or-오늘 entry, not the landing page", () => {
    expect(manifest().start_url).toBe(APP_ENTRY_PATH);
    expect(manifest().start_url).not.toBe("/");
  });
});
