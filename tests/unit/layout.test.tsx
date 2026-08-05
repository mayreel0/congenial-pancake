// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";

const auth = vi.hoisted(() => vi.fn());
const getUnreadNotificationCount = vi.hoisted(() => vi.fn());

vi.mock("@/app/login/actions", () => ({
  logout: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  auth
}));

vi.mock("@/server/notifications", () => ({
  getUnreadNotificationCount
}));

describe("RootLayout", () => {
  beforeEach(() => {
    auth.mockReset();
    getUnreadNotificationCount.mockReset();
    auth.mockResolvedValue({ user: { id: "user_1" } });
    getUnreadNotificationCount.mockResolvedValue(2);
  });

  it("renders a logout action in the global navigation", async () => {
    const layout = await RootLayout({
      children: <p>본문</p>
    });

    render(
      layout
    );

    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  });

  it("renders login instead of logout for signed out visitors", async () => {
    auth.mockResolvedValue(null);
    getUnreadNotificationCount.mockResolvedValue(0);
    const layout = await RootLayout({
      children: <p>본문</p>
    });

    render(layout);

    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
  });

  it("keeps current destinations and omits redirect-only praise links", async () => {
    const layout = await RootLayout({
      children: <p>본문</p>
    });

    render(layout);

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "내 활동" })).toHaveAttribute("href", "/me");
    expect(screen.queryByRole("link", { name: "칭찬글" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "랭킹" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "글쓰기" })).not.toBeInTheDocument();
  });

  it("renders an unread notification count in the global navigation", async () => {
    const layout = await RootLayout({
      children: <p>본문</p>
    });

    render(layout);

    expect(screen.getByRole("link", { name: "알림 2" })).toHaveAttribute("href", "/notifications");
  });
});
