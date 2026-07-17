// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NicknameOnboardingPage from "@/app/onboarding/nickname/page";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "user_1" } }))
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUniqueOrThrow: vi.fn(async () => ({
        name: "네이버 사용자",
        nickname: "다정한햇살482"
      }))
    }
  }
}));

vi.mock("@/app/onboarding/nickname/actions", () => ({
  saveNickname: vi.fn()
}));

describe("NicknameOnboardingPage", () => {
  it("shows a random nickname by default and allows importing the Naver name", async () => {
    render(await NicknameOnboardingPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "닉네임 설정" })).toBeInTheDocument();
    expect(screen.getByLabelText("닉네임")).toHaveValue("다정한햇살482");
    expect(screen.getByRole("checkbox", { name: "네이버 이름 가져오기" })).toHaveAttribute("value", "네이버 사용자");
    expect(screen.getByRole("button", { name: "닉네임 저장" })).toBeInTheDocument();
  });
});
