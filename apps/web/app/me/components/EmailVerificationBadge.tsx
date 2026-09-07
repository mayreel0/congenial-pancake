"use client";

import { useState } from "react";
import { ApiError } from "../../lib/api";
import { useResendVerificationMutation } from "../../lib/auth/queries";

type ResendStatus = "idle" | "pending" | "done" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_EMAIL_SEND_FAILED: "발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? error.message;
  }
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

// Rendered only when the account is unverified — see MeContent, which
// checks user.emailVerified before mounting this at all.
export function EmailVerificationBadge() {
  const resendMutation = useResendVerificationMutation();
  const [status, setStatus] = useState<ResendStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleResend(): Promise<void> {
    setStatus("pending");
    setError(null);
    try {
      await resendMutation.mutateAsync();
      setStatus("done");
    } catch (submitError) {
      setError(errorMessage(submitError));
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
        미인증
      </span>
      {status === "done" ? (
        <span className="text-muted">인증 메일을 다시 보냈어요.</span>
      ) : (
        <button
          className="text-muted underline-offset-2 hover:underline disabled:opacity-50"
          disabled={status === "pending"}
          type="button"
          onClick={() => void handleResend()}
        >
          {status === "pending" ? "발송하는 중" : "인증 메일 재발송"}
        </button>
      )}
      {error && <span className="text-red-600">{error}</span>}
    </div>
  );
}
