"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError, resetPassword } from "../lib/api";
import { ResetPasswordBody, type ResetPasswordStatus } from "./ResetPasswordBody";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<ResetPasswordStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setStatus("pending");
    try {
      await resetPassword(token, password);
      setStatus("done");
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
            비밀번호 설정
          </h1>
        </div>

        <ResetPasswordBody
          error={error}
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
