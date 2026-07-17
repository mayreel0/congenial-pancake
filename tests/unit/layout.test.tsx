// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";

vi.mock("@/app/login/actions", () => ({
  logout: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "user_1" } }))
}));

vi.mock("@/server/notifications", () => ({
  getUnreadNotificationCount: vi.fn(async () => 2)
}));

describe("RootLayout", () => {
  it("renders a logout action in the global navigation", async () => {
    const layout = await RootLayout({
      children: <p>본문</p>
    });

    render(
      layout
    );

    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  });

  it("renders an unread notification count in the global navigation", async () => {
    const layout = await RootLayout({
      children: <p>본문</p>
    });

    render(layout);

    expect(screen.getByRole("link", { name: "알림 2" })).toHaveAttribute("href", "/notifications");
  });
});
