"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "ui/Button";
import { TextField } from "ui/TextField";
import { ApiError, oauthLoginUrl } from "../lib/api";
import { useAuth } from "../lib/auth/useAuth";
import { OAuthButton } from "./components/OAuthButton";
import { useLastOAuthProvider } from "./lib/lastOAuthProvider";

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

function submitButtonLabel(submitStatus: SubmitStatus, mode: Mode): string {
  if (submitStatus === "pending") return "처리 중";
  if (mode === "login") return "로그인";
  return "회원가입";
}

export default function LoginPage() {
  const router = useRouter();
  const { status, login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const lastProvider = useLastOAuthProvider();

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
          <TextField
            autoComplete="email"
            id="email"
            label="이메일"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
          <TextField
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            id="password"
            label="비밀번호"
            minLength={8}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            disabled={submitStatus === "pending"}
            fullWidth
            type="submit"
          >
            {submitButtonLabel(submitStatus, mode)}
          </Button>
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

        <div className="space-y-2">
          <OAuthButton
            href={oauthLoginUrl("google")}
            lastUsed={lastProvider === "google"}
            provider="google"
          />
          <OAuthButton
            href={oauthLoginUrl("kakao")}
            lastUsed={lastProvider === "kakao"}
            provider="kakao"
          />
          <OAuthButton
            href={oauthLoginUrl("naver")}
            lastUsed={lastProvider === "naver"}
            provider="naver"
          />
        </div>

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
