import { describe, expect, it, vi } from "vitest";

const createUser = vi.fn(async (user) => ({ id: "user_1", ...user }));
const resolveUniqueNickname = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/server/signup", () => ({
  resolveUniqueNickname
}));

import { withSignupNickname } from "@/lib/auth-adapter";

describe("auth adapter", () => {
  it("adds a unique nickname when an OAuth user is created", async () => {
    resolveUniqueNickname.mockResolvedValue("네이버사용자");
    const adapter = withSignupNickname({ createUser });

    await adapter.createUser?.({
      id: "oauth_user",
      email: "user@example.com",
      name: "네이버 사용자",
      image: null,
      emailVerified: null
    });

    expect(resolveUniqueNickname).toHaveBeenCalledWith("네이버 사용자");
    expect(createUser).toHaveBeenCalledWith({
      email: "user@example.com",
      id: "oauth_user",
      name: "네이버 사용자",
      image: null,
      emailVerified: null,
      nickname: "네이버사용자"
    });
  });
});
