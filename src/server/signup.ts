import "server-only";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("INVALID_EMAIL"),
  nickname: z.string().trim().min(2, "NICKNAME_TOO_SHORT").max(24, "NICKNAME_TOO_LONG"),
  password: z.string().min(8, "PASSWORD_TOO_SHORT").max(72, "PASSWORD_TOO_LONG")
});

export type SignupInput = z.input<typeof signupSchema>;

const nicknameAdjectives = ["다정한", "포근한", "든든한", "반짝이는", "차분한", "따뜻한"];
const nicknameNouns = ["햇살", "응원", "마음", "용기", "칭찬", "미소"];

export function normalizeSignupInput(input: SignupInput) {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "INVALID_SIGNUP_INPUT");
  }
  return parsed.data;
}

export function normalizeNicknameInput(nickname: string): string {
  const normalized = nickname.trim();
  if (normalized.length < 2) throw new Error("NICKNAME_TOO_SHORT");
  if (normalized.length > 24) throw new Error("NICKNAME_TOO_LONG");
  return normalized;
}

function normalizeNicknameSeed(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().replace(/\s+/g, "");
  if (normalized.length >= 2) return normalized.slice(0, 20);
  return "칭찬러";
}

function randomNumber(max: number): number {
  return Math.floor(Math.random() * max);
}

function randomNicknameSeed(): string {
  const adjective = nicknameAdjectives[randomNumber(nicknameAdjectives.length)] ?? "다정한";
  const noun = nicknameNouns[randomNumber(nicknameNouns.length)] ?? "칭찬";
  return `${adjective}${noun}${randomNumber(900) + 100}`;
}

export async function generateNicknameSuggestion(): Promise<string> {
  for (let index = 0; index < 20; index += 1) {
    const candidate = randomNicknameSeed();
    const existing = await db.user.findUnique({ where: { nickname: candidate } });
    if (!existing) return candidate;
  }
  return resolveUniqueNickname(`칭찬러${Date.now().toString(36)}`);
}

export async function resolveUniqueNickname(seed: string | null | undefined): Promise<string> {
  const base = normalizeNicknameSeed(seed);
  for (let index = 1; index <= 50; index += 1) {
    const candidate = index === 1 ? base : `${base}${index}`;
    const existing = await db.user.findUnique({ where: { nickname: candidate } });
    if (!existing) return candidate;
  }
  return `${base}${Date.now().toString(36)}`;
}

export async function updateRequiredNickname(userId: string, nicknameInput: string) {
  const nickname = normalizeNicknameInput(nicknameInput);
  const existing = await db.user.findFirst({
    where: {
      nickname,
      NOT: { id: userId }
    },
    select: { id: true }
  });
  if (existing) throw new Error("NICKNAME_ALREADY_REGISTERED");

  return db.user.update({
    where: { id: userId },
    data: {
      nickname,
      nicknameSetupRequired: false
    }
  });
}

export async function createAccount(input: SignupInput) {
  const data = normalizeSignupInput(input);
  const existing = await db.user.findFirst({
    where: {
      OR: [{ email: data.email }, { nickname: data.nickname }]
    },
    select: { email: true, nickname: true }
  });

  if (existing?.email === data.email) {
    throw new Error("EMAIL_ALREADY_REGISTERED");
  }
  if (existing?.nickname === data.nickname) {
    throw new Error("NICKNAME_ALREADY_REGISTERED");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  return db.user.create({
    data: {
      email: data.email,
      nickname: data.nickname,
      passwordHash
    }
  });
}
