"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, googleLoginUrl } from "../lib/api";
import { useAuth } from "../lib/auth/useAuth";

type Mode = "login" | "signup";
type SubmitStatus = "idle" | "pending";

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_EMAIL_TAKEN: "이미 등록된 이메일입니다.",
  AUTH_INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? error.message;
  }
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export default function LoginPage() {
  const router = useRouter();
  const { status, login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace("/today");
  }, [status, router]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitStatus("pending");
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      router.push("/today");
    } catch (submitError) {
      setError(errorMessage(submitError));
      setSubmitStatus("idle");
    }
  }

  return (
    <main className="flex min-h-dvh items-center bg-background px-5 py-10 text-foreground sm:px-8">
      <section className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-3">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            {mode === "login" ? "로그인" : "회원가입"}
          </h1>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary"
              id="password"
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitStatus === "pending"}
            type="submit"
          >
            {submitStatus === "pending"
              ? "처리 중"
              : mode === "login"
                ? "로그인"
                : "회원가입"}
          </button>
        </form>

        <button
          className="text-sm text-muted underline-offset-2 hover:underline"
          type="button"
          onClick={() => {
            setMode((current) => (current === "login" ? "signup" : "login"));
            setError(null);
          }}
        >
          {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
        </button>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          또는
          <span className="h-px flex-1 bg-line" />
        </div>

        <a
          className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
          href={googleLoginUrl()}
        >
          Google로 계속하기
        </a>

        <Link
          className="block text-center text-sm text-muted underline-offset-2 hover:underline"
          href="/today"
        >
          비회원으로 계속하기
        </Link>
      </section>
    </main>
  );
}
