// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
}));
const requiresNicknameSetup = vi.hoisted(() => vi.fn());
const listRecentPosts = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/server/onboarding", () => ({ requiresNicknameSetup }));
vi.mock("@/server/posts", () => ({ listRecentPosts }));

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("redirects users who still need nickname setup", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    requiresNicknameSetup.mockResolvedValue(true);

    await expect(HomePage()).rejects.toThrow("REDIRECT:/onboarding/nickname");
  });

  it("renders recent praise posts for users with completed onboarding", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    requiresNicknameSetup.mockResolvedValue(false);
    listRecentPosts.mockResolvedValue([]);

    render(await HomePage());

    expect(screen.getByRole("heading", { name: /^칭찬$/ })).toBeInTheDocument();
  });
});
