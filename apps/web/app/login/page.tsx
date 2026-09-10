"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loginSchema, signupSchema } from "shared/dto";
import { Button } from "ui/Button";
import { TextField } from "ui/TextField";
import { SUBMIT_SPINNER_DELAY_MS, useDelayedPending } from "ui/useDelayedPending";
import { ApiError, errorMessage, oauthLoginUrl } from "../lib/api";
import { useAuth } from "../lib/auth/useAuth";
import { useFieldValidation } from "ui/useFieldValidation";
import { parseFieldErrors } from "shared/zod-form";
import { OAuthButton } from "./components/OAuthButton";
import { useLastOAuthProvider } from "./lib/lastOAuthProvider";

type Mode = "login" | "signup";
type SubmitStatus = "idle" | "pending";
type Field = "email" | "password";

const EMAIL_NOT_VERIFIED_CODE = "AUTH_EMAIL_NOT_VERIFIED";

function submitButtonLabel(mode: Mode): string {
  return mode === "login" ? "로그인" : "인증 메일 받기";
}

export default function LoginPage() {
  const router = useRouter();
  const { status, login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  // A signup request never authenticates anything (nothing is created
  // until the emailed link is consumed) — this just tracks whether to show
  // the "check your email" screen in place of the form.
  const [signupRequested, setSignupRequested] = useState(false);
  const lastProvider = useLastOAuthProvider();
  const { touchAll, visibleError } = useFieldValidation<Field>();

  useEffect(() => {
    if (status === "authenticated") router.replace("/today");
  }, [status, router]);

  const schema = mode === "login" ? loginSchema : signupSchema;
  const fieldErrors = parseFieldErrors(
    schema,
    mode === "login" ? { email, password } : { email },
  );
  // Delayed so a fast login doesn't flash the spinner — the button's own
  // disabled state below still gates on the raw submitStatus.
  const showSpinner = useDelayedPending(
    submitStatus === "pending",
    SUBMIT_SPINNER_DELAY_MS,
  );

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    touchAll(mode === "login" ? ["email", "password"] : ["email"]);
    if (Object.keys(fieldErrors).length > 0) return;

    setError(null);
    setNeedsVerification(false);
    setSubmitStatus("pending");
    try {
      if (mode === "login") {
        await login(email, password);
        router.push("/today");
      } else {
        await signup(email);
        setSignupRequested(true);
      }
    } catch (submitError) {
      setError(errorMessage(submitError));
      setNeedsVerification(
        submitError instanceof ApiError &&
          submitError.code === EMAIL_NOT_VERIFIED_CODE,
      );
      setSubmitStatus("idle");
    }
  }

  async function handleResend(): Promise<void> {
    setSubmitStatus("pending");
    try {
      await signup(email);
      setSignupRequested(true);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitStatus("idle");
    }
  }

  if (signupRequested) {
    return (
      <main className="flex min-h-dvh items-center bg-background px-5 py-10 text-foreground sm:px-8">
        <section className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-3">
            <p className="text-sm text-muted">온설</p>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
              인증 메일을 보냈어요
            </h1>
          </div>
          <p className="text-sm text-primary">
            메일함에서 링크를 눌러 가입을 완료해주세요.
          </p>
          <Link
            className="block text-center text-sm text-muted underline-offset-2 hover:underline"
            href="/today"
          >
            나중에 하기
          </Link>
        </section>
      </main>
    );
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
            error={visibleError("email", fieldErrors)}
            id="email"
            label="이메일"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
          {mode === "login" && (
            <TextField
              autoComplete="current-password"
              error={visibleError("password", fieldErrors)}
              id="password"
              label="비밀번호"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {needsVerification && (
            <button
              className="text-sm text-muted underline-offset-2 hover:underline"
              type="button"
              onClick={() => void handleResend()}
            >
              인증 메일 다시 받기
            </button>
          )}

          <Button
            disabled={
              Object.keys(fieldErrors).length > 0 ||
              submitStatus === "pending"
            }
            fullWidth
            pending={showSpinner}
            type="submit"
          >
            {submitButtonLabel(mode)}
          </Button>
        </form>

        <button
          className="text-sm text-muted underline-offset-2 hover:underline"
          type="button"
          onClick={() => {
            setMode((current) => (current === "login" ? "signup" : "login"));
            setError(null);
            setNeedsVerification(false);
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
