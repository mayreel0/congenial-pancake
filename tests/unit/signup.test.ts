import { beforeEach, describe, expect, it, vi } from "vitest";

const hash = vi.hoisted(() => vi.fn());
const findFirst = vi.hoisted(() => vi.fn());
const findUnique = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("bcryptjs", () => ({
  default: { hash },
  hash
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findFirst, findUnique, create, update }
  }
}));

import {
  createAccount,
  generateNicknameSuggestion,
  normalizeSignupInput,
  resolveUniqueNickname,
  updateRequiredNickname
} from "@/server/signup";

describe("signup", () => {
  beforeEach(() => {
    hash.mockReset();
    findFirst.mockReset();
    findUnique.mockReset();
    create.mockReset();
    update.mockReset();
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

  it("generates a unique random nickname suggestion", async () => {
    findUnique.mockResolvedValueOnce(null);

    const nickname = await generateNicknameSuggestion();

    expect(nickname.length).toBeGreaterThanOrEqual(2);
    expect(findUnique).toHaveBeenCalledWith({ where: { nickname } });
  });

  it("resolves a unique nickname from a seed", async () => {
    findUnique
      .mockResolvedValueOnce({ id: "user_1" })
      .mockResolvedValueOnce({ id: "user_2" })
      .mockResolvedValueOnce(null);

    await expect(resolveUniqueNickname("다정한사람")).resolves.toBe("다정한사람3");
  });

  it("updates a required nickname after checking duplicates", async () => {
    findFirst.mockResolvedValue(null);

    await updateRequiredNickname("user_1", "새로운칭찬러");

    expect(create).not.toHaveBeenCalled();
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        nickname: "새로운칭찬러",
        NOT: { id: "user_1" }
      },
      select: { id: true }
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        nickname: "새로운칭찬러",
        nicknameSetupRequired: false
      }
    });
  });
});
