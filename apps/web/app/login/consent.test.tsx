import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";
import { VerifyEmailForm } from "../verify-email/VerifyEmailForm";

const auth = vi.hoisted(() => ({
  login: vi.fn(),
  signup: vi.fn(),
  completeSignup: vi.fn(),
  query: "token=signup-token",
}));

vi.mock("../lib/auth/useAuth", () => ({
  useAuth: () => ({ status: "anonymous", ...auth }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(auth.query),
}));

beforeEach(() => {
  vi.clearAllMocks();
  auth.query = "token=signup-token";
  auth.login.mockResolvedValue(undefined);
  auth.signup.mockResolvedValue(undefined);
  auth.completeSignup.mockResolvedValue(undefined);
});

describe("가입 동의", () => {
  it("이메일 가입은 동의 전 제출을 막고 동의 취소도 반영한다", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "계정이 없으신가요? 회원가입" }));
    await user.type(screen.getByLabelText("이메일"), "member@example.com");
    const submit = screen.getByRole("button", { name: "인증 메일 받기" });
    const consent = screen.getByRole("checkbox");
    expect(consent).not.toBeChecked();
    expect(submit).toBeDisabled();
    fireEvent.submit(submit.closest("form")!);
    expect(auth.signup).not.toHaveBeenCalled();
    await user.click(consent);
    expect(submit).toBeEnabled();
    await user.click(consent);
    expect(submit).toBeDisabled();
    await user.click(consent);
    await user.click(submit);
    await waitFor(() => expect(auth.signup).toHaveBeenCalledWith("member@example.com"));
  });

  it("소셜 가입에서만 동의를 요구하고 정책은 새 탭으로 연다", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const providers = ["Google 계정으로 로그인", "네이버 로그인"];
    expect(screen.queryByText("카카오 로그인")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    for (const name of providers) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).not.toContain("signup=true");
    }
    await user.click(screen.getByRole("button", { name: "계정이 없으신가요? 회원가입" }));
    for (const name of providers) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
      expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
    }
    expect(screen.queryByText("카카오 로그인")).not.toBeInTheDocument();
    const termsLink = screen.getByRole("link", { name: /^이용약관\s*\(새 탭\)$/ });
    const privacyLink = screen.getByRole("link", { name: /^개인정보처리방침\s*\(새 탭\)$/ });
    expect(termsLink).toHaveAttribute("href", "/terms");
    expect(privacyLink).toHaveAttribute("href", "/privacy");
    for (const link of [termsLink, privacyLink]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    await user.click(screen.getByRole("checkbox"));
    for (const name of providers) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toContain("signup=true");
    }
    expect(screen.queryByText("카카오 로그인")).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox"));
    for (const name of providers) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });

  it("기존 이메일 로그인에는 가입 동의를 요구하지 않는다", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("이메일"), "member@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "Password123!");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^로그인$/ }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith("member@example.com", "Password123!"));
  });

  it("미가입 소셜 사용자는 가입 안내와 미선택 동의로 돌아온다", () => {
    auth.query = "mode=signup&signupRequired=1";
    render(<LoginForm />);
    expect(screen.getByRole("heading", { name: "회원가입" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("아직 가입된 계정이 없어요");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Google 계정으로 로그인" })).toBeDisabled();
  });

  it("인증 링크로 직접 진입해도 동의해야 가입을 완료한다", async () => {
    const user = userEvent.setup();
    render(<VerifyEmailForm />);
    await user.type(screen.getByLabelText("비밀번호"), "Password123!");
    const submit = screen.getByRole("button", { name: "가입 완료" });
    expect(submit).toBeDisabled();
    fireEvent.submit(submit.closest("form")!);
    expect(auth.completeSignup).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(submit);
    await waitFor(() => expect(auth.completeSignup).toHaveBeenCalledWith("signup-token", "Password123!"));
  });
});
