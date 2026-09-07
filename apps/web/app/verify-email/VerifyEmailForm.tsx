"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError, verifyEmail } from "../lib/api";
import { useAuth } from "../lib/auth/useAuth";
import { VerifyEmailBody, type VerifyEmailStatus } from "./VerifyEmailBody";

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_EMAIL_VERIFICATION_TOKEN_INVALID:
    "인증 링크가 유효하지 않거나 만료되었습니다.",
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? error.message;
  }
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { refresh } = useAuth();
  const [status, setStatus] = useState<VerifyEmailStatus>("pending");
  const [error, setError] = useState<string | null>(null);
  // A single-use token: guards against React StrictMode's dev-only double
  // effect invocation actually sending the request twice, where the
  // second call would fail with "already used" right after the first
  // genuinely succeeded.
  const hasRequested = useRef(false);

  useEffect(() => {
    if (!token || hasRequested.current) return;
    hasRequested.current = true;

    verifyEmail(token)
      .then(() => {
        setStatus("done");
        void refresh();
      })
      .catch((submitError: unknown) => {
        setError(errorMessage(submitError));
        setStatus("error");
      });
  }, [token, refresh]);

  return (
    <main className="flex min-h-dvh items-center bg-background px-5 py-10 text-foreground sm:px-8">
      <section className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-3">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            이메일 인증
          </h1>
        </div>

        <VerifyEmailBody error={error} status={status} token={token} />
      </section>
    </main>
  );
}
