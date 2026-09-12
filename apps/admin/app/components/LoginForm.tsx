"use client";

import { useState, type FormEvent } from "react";
import { Button } from "ui/Button";
import { TextField } from "ui/TextField";
import { useFieldValidation } from "ui/useFieldValidation";
import { BUTTON_PENDING_MIN_MS, useMinDisplayDuration } from "ui/useMinDisplayDuration";
import { loginSchema } from "shared/dto";
import { parseFieldErrors } from "shared/zod-form";
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

type Field = "email" | "password";

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
  const { touchAll, visibleError } = useFieldValidation<Field>();

  const fieldErrors = parseFieldErrors(loginSchema, { email, password });
  const showSpinner = useMinDisplayDuration(pending, BUTTON_PENDING_MIN_MS);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    touchAll(["email", "password"]);
    if (Object.keys(fieldErrors).length > 0) return;

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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        disabled={Object.keys(fieldErrors).length > 0 || showSpinner}
        fullWidth
        pending={showSpinner}
        type="submit"
      >
        로그인
      </Button>

      {/* OAuth-only 계정은 이메일/비밀번호가 없어 이 폼으로 로그인할 수
          없다 — 여기서 새로 로그인할 방법을 만드는 대신, 온설 공개
          사이트에서 로그인하면 세션 쿠키가 공유돼(api.onseol.com이
          발급하는 쿠키라 어느 프론트에서 요청하든 그대로 전달됨) 이 앱도
          이미 로그인된 상태가 된다는 걸 안내한다. */}
      <p className="text-center text-xs text-neutral-500">
        구글/카카오/네이버로 가입한 계정은 온설 공개 사이트에서 먼저
        로그인한 뒤 이 페이지를 새로고침해주세요.
      </p>
    </form>
  );
}
