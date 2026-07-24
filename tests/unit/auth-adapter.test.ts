import { describe, expect, it, vi } from "vitest";

const createUser = vi.fn(async (user) => ({ id: "user_1", ...user }));
const generateNicknameSuggestion = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/server/signup", () => ({
  generateNicknameSuggestion
}));

import { withSignupNickname } from "@/lib/auth-adapter";

describe("auth adapter", () => {
  it("adds a temporary nickname and requires setup when an OAuth user is created", async () => {
    generateNicknameSuggestion.mockResolvedValue("다정한햇살482");
    const adapter = withSignupNickname({ createUser });

    await adapter.createUser?.({
      id: "oauth_user",
      email: "user@example.com",
      name: "네이버 사용자",
      image: null,
      emailVerified: null
    });

    expect(generateNicknameSuggestion).toHaveBeenCalled();
    expect(createUser).toHaveBeenCalledWith({
      email: "user@example.com",
      id: "oauth_user",
      name: "네이버 사용자",
      image: null,
      emailVerified: null,
      nickname: "다정한햇살482",
      nicknameSetupRequired: true
    });
  });
});
