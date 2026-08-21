import { render, screen, within } from "../../lib/test-utils";
import { describe, expect, it, vi } from "vitest";
import { LandingPage } from "./LandingPage";

describe("LandingPage", () => {
  it("shows landing entry navigation", async () => {
    render(<LandingPage />);

    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
    expect(within(header).getByRole("link", { name: "온설" })).toHaveAttribute(
      "href",
      "/",
    );
    // Auth state resolves asynchronously (AuthProvider fetches /auth/me on mount).
    expect(
      await within(header).findByRole("link", { name: "로그인" }),
    ).toHaveAttribute("href", "/login");
    expect(
      within(header).getByRole("link", { name: "웹에서 시작하기" }),
    ).toHaveAttribute("href", "/today");
  });

  it("shows the user's email and a logout button when authenticated", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: "1",
          email: "test@example.com",
          createdAt: "2026-08-20T00:00:00.000Z",
        }),
    });

    render(<LandingPage />);

    const header = screen.getByRole("banner");
    expect(await within(header).findByText("test@example.com")).toBeInTheDocument();
    expect(
      within(header).getByRole("button", { name: "로그아웃" }),
    ).toBeInTheDocument();
    expect(
      within(header).queryByRole("link", { name: "로그인" }),
    ).not.toBeInTheDocument();
  });

  it("does not expose the full service menu on landing", () => {
    render(<LandingPage />);

    expect(
      screen.queryByRole("link", { name: "답하기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "온설 읽기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "내 기록" }),
    ).not.toBeInTheDocument();
  });
});
