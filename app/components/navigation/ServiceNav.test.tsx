import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServiceNav } from "./ServiceNav";

describe("ServiceNav", () => {
  it("shows desktop service links and login entry", () => {
    render(<ServiceNav activePath="/today" />);

    const desktopNav = screen.getByLabelText("서비스 주요 이동");
    expect(
      within(desktopNav).getByRole("link", { name: "남기기" }),
    ).toHaveAttribute("href", "/today");
    expect(
      within(desktopNav).getByRole("link", { name: "답하기" }),
    ).toHaveAttribute("href", "/answer");
    expect(
      within(desktopNav).getByRole("link", { name: "온설 읽기" }),
    ).toHaveAttribute("href", "/read");
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("marks the active route", () => {
    render(<ServiceNav activePath="/answer" />);

    expect(screen.getByRole("link", { name: "답하기" })).toHaveAttribute(
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
});
