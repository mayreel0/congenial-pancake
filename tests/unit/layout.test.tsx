// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";

vi.mock("@/app/login/actions", () => ({
  logout: vi.fn()
}));

describe("RootLayout", () => {
  it("renders a logout action in the global navigation", () => {
    render(
      <RootLayout>
        <p>본문</p>
      </RootLayout>
    );

    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  });
});
