import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
}));
const updateRequiredNickname = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/server/signup", () => ({ updateRequiredNickname }));

import { saveNickname } from "@/app/onboarding/nickname/actions";

describe("nickname onboarding actions", () => {
  beforeEach(() => {
    auth.mockReset();
    redirect.mockClear();
    updateRequiredNickname.mockReset();
  });

  it("saves the typed nickname for the current user", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    updateRequiredNickname.mockResolvedValue({ id: "user_1" });
    const formData = new FormData();
    formData.set("nickname", "새로운칭찬러");

    await expect(saveNickname(formData)).rejects.toThrow("REDIRECT:/");

    expect(updateRequiredNickname).toHaveBeenCalledWith("user_1", "새로운칭찬러");
  });

  it("uses the Naver name when requested", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    updateRequiredNickname.mockResolvedValue({ id: "user_1" });
    const formData = new FormData();
    formData.set("nickname", "다정한햇살482");
    formData.set("providerName", "네이버 사용자");
    formData.set("useNaverName", "네이버 사용자");

    await expect(saveNickname(formData)).rejects.toThrow("REDIRECT:/");

    expect(updateRequiredNickname).toHaveBeenCalledWith("user_1", "네이버 사용자");
  });
});
