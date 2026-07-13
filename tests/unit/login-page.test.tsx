// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";

vi.mock("@/app/login/actions", () => ({
  loginWithCredentials: vi.fn()
}));

describe("LoginPage", () => {
  it("uses a server action instead of posting directly to the credentials callback", () => {
    render(<LoginPage />);

    const form = screen.getByRole("button", { name: "로그인" }).closest("form");
    expect(form).not.toBeNull();
    expect(form?.getAttribute("action") ?? "").not.toContain("/api/auth/callback/credentials");
  });
});
