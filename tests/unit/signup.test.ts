import { beforeEach, describe, expect, it, vi } from "vitest";

const hash = vi.hoisted(() => vi.fn());
const findFirst = vi.hoisted(() => vi.fn());
const findUnique = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("bcryptjs", () => ({
  default: { hash },
  hash
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findFirst, findUnique, create }
  }
}));

import { createAccount, normalizeSignupInput, resolveUniqueNickname } from "@/server/signup";

describe("signup", () => {
  beforeEach(() => {
    hash.mockReset();
    findFirst.mockReset();
    findUnique.mockReset();
    create.mockReset();
  });

  it("normalizes signup input", () => {
    expect(
      normalizeSignupInput({
        email: "  USER@Example.COM ",
        nickname: "  다정한사람  ",
        password: "password1234"
      })
    ).toEqual({
      email: "user@example.com",
      nickname: "다정한사람",
      password: "password1234"
    });
  });

  it("rejects duplicate email or nickname", async () => {
    findFirst.mockResolvedValueOnce({ email: "user@example.com", nickname: "기존닉네임" });

    await expect(
      createAccount({
        email: "user@example.com",
        nickname: "새닉네임",
        password: "password1234"
      })
    ).rejects.toThrow("EMAIL_ALREADY_REGISTERED");

    findFirst.mockResolvedValueOnce({ email: "other@example.com", nickname: "새닉네임" });

    await expect(
      createAccount({
        email: "new@example.com",
        nickname: "새닉네임",
        password: "password1234"
      })
    ).rejects.toThrow("NICKNAME_ALREADY_REGISTERED");
  });

  it("hashes the password and creates a normal account", async () => {
    findFirst.mockResolvedValue(null);
    hash.mockResolvedValue("hashed_password");
    create.mockResolvedValue({ id: "user_1", email: "user@example.com", nickname: "다정한사람" });

    await createAccount({
      email: "user@example.com",
      nickname: "다정한사람",
      password: "password1234"
    });

    expect(hash).toHaveBeenCalledWith("password1234", 10);
    expect(create).toHaveBeenCalledWith({
      data: {
        email: "user@example.com",
        nickname: "다정한사람",
        passwordHash: "hashed_password"
      }
    });
  });

  it("resolves a unique nickname for OAuth accounts", async () => {
    findUnique
      .mockResolvedValueOnce({ id: "user_1" })
      .mockResolvedValueOnce({ id: "user_2" })
      .mockResolvedValueOnce(null);

    await expect(resolveUniqueNickname("다정한사람")).resolves.toBe("다정한사람3");
  });
});
