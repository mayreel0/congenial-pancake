import { fireEvent, render, screen, within } from "../../lib/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ServiceNav } from "./ServiceNav";

function mockAuthenticated(email = "test@example.com") {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({ id: "1", email, createdAt: "2026-08-20T00:00:00.000Z" }),
  });
}

describe("ServiceNav", () => {
  it("shows desktop service links and login entry", async () => {
    render(<ServiceNav activePath="/today" />);

    const desktopNav = screen.getByLabelText("서비스 주요 이동");
    const personalNav = screen.getByLabelText("개인 영역");
    expect(
      within(desktopNav).getByRole("link", { name: "남기기" }),
    ).toHaveAttribute("href", "/today");
    expect(
      within(desktopNav).getByRole("link", { name: "답하기" }),
    ).toHaveAttribute("href", "/answer");
    expect(
      within(desktopNav).getByRole("link", { name: "온설 읽기" }),
    ).toHaveAttribute("href", "/read");
    // Auth state resolves asynchronously (AuthProvider fetches /auth/me on mount) —
    // the personal-area link only renders once it settles to "anonymous". There's
    // no "내 기록" entry before login — it lives inside the profile menu instead.
    expect(
      await within(personalNav).findByRole("link", { name: "로그인" }),
    ).toHaveAttribute("href", "/login");
    expect(
      within(personalNav).queryByRole("link", { name: "내 기록" }),
    ).not.toBeInTheDocument();
    expect(
      within(personalNav).queryByRole("link", { name: "내 정보" }),
    ).not.toBeInTheDocument();
  });

  it("marks the active route", () => {
    render(<ServiceNav activePath="/answer" />);

    expect(screen.getByRole("link", { name: "답하기" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks my records active inside the profile menu", async () => {
    mockAuthenticated();
    render(<ServiceNav activePath="/records" />);

    fireEvent.click(await screen.findByRole("button", { name: "프로필 메뉴" }));

    const profileMenu = screen.getByLabelText("프로필");
    expect(
      within(profileMenu).getByRole("link", { name: "내 기록" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("opens mobile menu with service links plus account links when authenticated", async () => {
    mockAuthenticated();
    render(<ServiceNav activePath="/today" />);
    await screen.findByRole("button", { name: "프로필 메뉴" });

    fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));

    const mobileMenu = screen.getByLabelText("모바일 서비스 이동");
    expect(
      within(mobileMenu).getByRole("link", { name: "남기기" }),
    ).toHaveAttribute("href", "/today");
    expect(
      within(mobileMenu).getByRole("link", { name: "내 정보" }),
    ).toHaveAttribute("href", "/me");
    expect(
      within(mobileMenu).getByRole("link", { name: "내 기록" }),
    ).toHaveAttribute("href", "/records");
    expect(screen.getByRole("button", { name: "메뉴 닫기" })).toBeInTheDocument();
  });

  it("hides account links from the mobile menu when anonymous", async () => {
    render(<ServiceNav activePath="/today" />);
    await screen.findByRole("link", { name: "로그인" });

    fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));

    const mobileMenu = screen.getByLabelText("모바일 서비스 이동");
    expect(
      within(mobileMenu).queryByRole("link", { name: "내 기록" }),
    ).not.toBeInTheDocument();
    expect(
      within(mobileMenu).queryByRole("link", { name: "내 정보" }),
    ).not.toBeInTheDocument();
  });

  it("does not render a mobile bottom tab", () => {
    render(<ServiceNav activePath="/today" />);

    expect(screen.queryByLabelText("하단 탭")).not.toBeInTheDocument();
  });

  it("shows an avatar (not the raw email) as the profile menu trigger when authenticated", async () => {
    mockAuthenticated();
    render(<ServiceNav activePath="/today" />);

    const trigger = await screen.findByRole("button", { name: "프로필 메뉴" });
    expect(trigger).toHaveTextContent("T");

    const personalNav = screen.getByLabelText("개인 영역");
    expect(
      within(personalNav).queryByRole("link", { name: "로그인" }),
    ).not.toBeInTheDocument();
    // Not open yet — email/내 기록/로그아웃 live inside the profile menu.
    expect(
      within(personalNav).queryByRole("button", { name: "로그아웃" }),
    ).not.toBeInTheDocument();
  });

  it("opens the profile menu with the full email, account links, and logout", async () => {
    mockAuthenticated();
    render(<ServiceNav activePath="/today" />);

    fireEvent.click(await screen.findByRole("button", { name: "프로필 메뉴" }));

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
});
