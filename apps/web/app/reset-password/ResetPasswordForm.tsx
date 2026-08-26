"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "ui/Button";
import { TextField } from "ui/TextField";
import { ApiError, resetPassword } from "../lib/api";

type SubmitStatus = "idle" | "pending" | "done";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
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

        {!token ? (
          <p className="text-sm text-red-600">유효하지 않은 링크입니다.</p>
        ) : status === "done" ? (
          <div className="space-y-4">
            <p className="text-sm text-primary">비밀번호를 설정했습니다.</p>
            <Link
              className="block text-center text-sm text-muted underline-offset-2 hover:underline"
              href="/login"
            >
              로그인하러 가기
            </Link>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <TextField
              autoComplete="new-password"
              id="password"
              label="새 비밀번호"
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button disabled={status === "pending"} fullWidth type="submit">
              {status === "pending" ? "처리 중" : "비밀번호 설정"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
