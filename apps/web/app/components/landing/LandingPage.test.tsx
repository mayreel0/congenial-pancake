import { fireEvent, render, screen, within } from "../../lib/test-utils";
import { describe, expect, it, vi } from "vitest";
import { LandingPage } from "./LandingPage";

describe("LandingPage", () => {
  it("shows the web footer with the contact email", () => {
    render(<LandingPage />);

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText("© 2026 온설")).toBeInTheDocument();
    expect(
      within(footer).getByRole("link", { name: /hello@onseol.com/ }),
    ).toHaveAttribute("href", "mailto:hello@onseol.com");
  });

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
    // The header's own entry CTA was dropped as a duplicate of the hero's
    // EntryActions ("웹에서 시작하기") — only "로그인" belongs here now.
    expect(
      within(header).queryByRole("link", { name: "웹에서 시작하기" }),
    ).not.toBeInTheDocument();
  });

  it("shows an avatar (profile menu trigger), not email/logout, when authenticated", async () => {
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
    const trigger = await within(header).findByRole("button", {
      name: "프로필 메뉴",
    });
    expect(trigger).toHaveTextContent("T");
    expect(
      within(header).queryByText("test@example.com"),
    ).not.toBeInTheDocument();
    expect(
      within(header).queryByRole("button", { name: "로그아웃" }),
    ).not.toBeInTheDocument();
    expect(
      within(header).queryByRole("link", { name: "로그인" }),
    ).not.toBeInTheDocument();
  });

  it("opens the same account dropdown as ServiceNav from the landing avatar", async () => {
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

    fireEvent.click(
      await screen.findByRole("button", { name: "프로필 메뉴" }),
    );

    const profileMenu = screen.getByLabelText("프로필");
    expect(within(profileMenu).getByText("test@example.com")).toBeInTheDocument();
    expect(
      within(profileMenu).getByRole("link", { name: "내 정보" }),
    ).toHaveAttribute("href", "/me");
    expect(
      within(profileMenu).getByRole("link", { name: "내 기록" }),
    ).toHaveAttribute("href", "/records");
    expect(
      within(profileMenu).getByRole("button", { name: "로그아웃" }),
    ).toBeInTheDocument();
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
