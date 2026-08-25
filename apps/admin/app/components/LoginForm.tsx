"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "../lib/api";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
};

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return LOGIN_ERROR_MESSAGES[error.code] ?? error.message;
  }
  return "로그인하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

type LoginFormProps = {
  login(email: string, password: string): Promise<void>;
};

// Shared by both admin pages (신고 검토, 설정) — each page independently
// gates its own content on auth status, so each renders this same form
// when signed out rather than routing through a single shared login page.
export function LoginForm({ login }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
    } catch (submitError) {
      setError(loginErrorMessage(submitError));
      setPending(false);
    }
  }

  return (
    <form
      className="mx-auto w-full max-w-sm space-y-3 py-16"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="space-y-1">
        <label className="text-sm text-muted" htmlFor="email">
          이메일
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary"
          id="email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-muted" htmlFor="password">
          비밀번호
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary"
          id="password"
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? "로그인 중" : "로그인"}
      </button>
    </form>
  );
}
