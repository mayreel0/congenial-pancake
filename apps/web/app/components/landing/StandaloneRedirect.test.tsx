import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../lib/test-utils";
import { StandaloneRedirect } from "./StandaloneRedirect";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const isStandaloneApp = vi.fn();
vi.mock("../../lib/notifications/push", () => ({
  isStandaloneApp: () => isStandaloneApp(),
}));

describe("StandaloneRedirect", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("sends the installed app to its entry instead of showing the landing page", () => {
    isStandaloneApp.mockReturnValue(true);
    render(<StandaloneRedirect />);

    expect(replace).toHaveBeenCalledWith("/login?returnTo=/today");
  });

  it("leaves a browser tab on the landing page", () => {
    isStandaloneApp.mockReturnValue(false);
    render(<StandaloneRedirect />);

    expect(replace).not.toHaveBeenCalled();
  });
});
