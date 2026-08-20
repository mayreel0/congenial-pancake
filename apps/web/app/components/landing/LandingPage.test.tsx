import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPage } from "./LandingPage";

describe("LandingPage", () => {
  it("shows landing entry navigation", () => {
    render(<LandingPage />);

    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
    expect(within(header).getByRole("link", { name: "온설" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(header).getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      within(header).getByRole("link", { name: "웹에서 시작하기" }),
    ).toHaveAttribute("href", "/today");
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
