// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";

vi.mock("@/app/login/actions", () => ({
  loginWithCredentials: vi.fn(),
  loginWithNaver: vi.fn()
}));

describe("LoginPage", () => {
  it("uses a server action instead of posting directly to the credentials callback", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));

    const form = screen.getByRole("button", { name: "로그인" }).closest("form");
    expect(form).not.toBeNull();
    expect(form?.getAttribute("action") ?? "").not.toContain("/api/auth/callback/credentials");
  });

  it("links to signup and offers Naver OAuth", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("button", { name: "네이버로 시작하기" })).toBeInTheDocument();
  });

  it("renders a Naver configuration error", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({ error: "naver" }) }));

    expect(screen.getByRole("alert")).toHaveTextContent("네이버 로그인이 아직 설정되지 않았습니다.");
  });
});
