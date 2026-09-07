"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { completeSignupSchema } from "shared/dto";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth/useAuth";
import { useFieldValidation } from "../lib/useFieldValidation";
import { parseFieldErrors } from "../lib/zod-form";
import { VerifyEmailBody, type VerifyEmailStatus } from "./VerifyEmailBody";

type Field = "password";

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_EMAIL_VERIFICATION_TOKEN_INVALID:
    "인증 링크가 유효하지 않거나 만료되었습니다.",
  AUTH_EMAIL_TAKEN: "이미 가입이 완료된 이메일입니다. 로그인해주세요.",
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? error.message;
  }
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { completeSignup } = useAuth();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<VerifyEmailStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const { touchAll, visibleError } = useFieldValidation<Field>();
  const fieldErrors = parseFieldErrors(completeSignupSchema, {
    token: token ?? "",
    password,
  });

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!token) return;
    touchAll(["password"]);
    if (Object.keys(fieldErrors).length > 0) return;

    setError(null);
    setStatus("pending");
    try {
      await completeSignup(token, password);
      // The token just proved this person owns the account — no reason to
      // make them turn around and log in with what they just typed.
      router.push("/today");
    } catch (submitError) {
      setError(errorMessage(submitError));
      setStatus("idle");
    }
  }

  return (
    <main className="flex min-h-dvh items-center bg-background px-5 py-10 text-foreground sm:px-8">
      <section className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-3">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            이메일 인증
          </h1>
        </div>

        <VerifyEmailBody
          error={error}
          fieldError={visibleError("password", fieldErrors)}
          password={password}
          status={status}
          token={token}
          onPasswordChange={setPassword}
          onSubmit={(event) => void handleSubmit(event)}
        />
      </section>
    </main>
  );
}
