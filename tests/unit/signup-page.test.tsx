// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignupPage from "@/app/signup/page";

vi.mock("@/app/signup/actions", () => ({
  signupWithCredentials: vi.fn()
}));

vi.mock("@/server/signup", () => ({
  generateNicknameSuggestion: vi.fn(async () => "다정한햇살482")
}));

describe("SignupPage", () => {
  it("renders the credential signup form", async () => {
    render(await SignupPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "회원가입" })).toBeInTheDocument();
    expect(screen.getByLabelText("이메일")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("닉네임")).toHaveValue("다정한햇살482");
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute("minLength", "8");
    expect(screen.getByRole("button", { name: "가입하기" })).toBeInTheDocument();
  });

  it("explains that banned accounts cannot bypass sanctions with a new signup", async () => {
    render(await SignupPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText(/제재된 계정은 새 계정으로 우회할 수 없습니다/)).toBeInTheDocument();
  });
});
