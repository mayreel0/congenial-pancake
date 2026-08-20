import { fireEvent, render, screen, within } from "../../lib/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ServiceNav } from "./ServiceNav";

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
    expect(within(personalNav).getByRole("link", { name: "내 기록" })).toHaveAttribute(
      "href",
      "/me",
    );
    // Auth state resolves asynchronously (AuthProvider fetches /auth/me on mount).
    expect(
      await within(personalNav).findByRole("link", { name: "로그인" }),
    ).toHaveAttribute("href", "/login");
  });

  it("marks the active route", () => {
    render(<ServiceNav activePath="/answer" />);

    expect(screen.getByRole("link", { name: "답하기" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks my records active in the personal area", () => {
    render(<ServiceNav activePath="/me" />);

    const personalNav = screen.getByLabelText("개인 영역");
    expect(within(personalNav).getByRole("link", { name: "내 기록" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens mobile menu with service links including my records", () => {
    render(<ServiceNav activePath="/today" />);

    fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));

    const mobileMenu = screen.getByLabelText("모바일 서비스 이동");
    expect(
      within(mobileMenu).getByRole("link", { name: "남기기" }),
    ).toHaveAttribute("href", "/today");
    expect(
      within(mobileMenu).getByRole("link", { name: "내 기록" }),
    ).toHaveAttribute("href", "/me");
    expect(screen.getByRole("button", { name: "메뉴 닫기" })).toBeInTheDocument();
  });

  it("does not render a mobile bottom tab", () => {
    render(<ServiceNav activePath="/today" />);

    expect(screen.queryByLabelText("하단 탭")).not.toBeInTheDocument();
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

    render(<ServiceNav activePath="/today" />);

    const personalNav = screen.getByLabelText("개인 영역");
    expect(await within(personalNav).findByText("test@example.com")).toBeInTheDocument();
    expect(
      within(personalNav).getByRole("button", { name: "로그아웃" }),
    ).toBeInTheDocument();
    expect(
      within(personalNav).queryByRole("link", { name: "로그인" }),
    ).not.toBeInTheDocument();
  });
});
