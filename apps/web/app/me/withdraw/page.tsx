"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { Button } from "ui/Button";
import { Toggle } from "ui/Toggle";
import { BUTTON_PENDING_MIN_MS, useMinDisplayDuration } from "ui/useMinDisplayDuration";
import { errorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth/useAuth";

type Status = "idle" | "pending" | "done";

export default function WithdrawPage() {
  const { status: authStatus, user, withdraw } = useAuth();
  const [immediate, setImmediate] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const showSpinner = useMinDisplayDuration(
    status === "pending",
    BUTTON_PENDING_MIN_MS,
  );

  async function handleConfirm(): Promise<void> {
    setConfirmOpen(false);
    setError(null);
    setStatus("pending");
    try {
      await withdraw(immediate);
      setStatus("done");
    } catch (submitError) {
      setError(errorMessage(submitError));
      setStatus("idle");
    }
  }

  // Checked before the anonymous branch below — a successful withdraw()
  // logs the account out (useAuth's query cache goes to null), which would
  // otherwise flip authStatus to "anonymous" on the very next render and
  // show the login prompt in place of this done screen.
  if (status === "done") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 px-5 py-10 text-foreground sm:px-8">
        <h1 className="text-2xl font-semibold tracking-normal">
          탈퇴 처리됐어요
        </h1>
        <p className="leading-7 text-muted">
          {immediate
            ? "계정이 즉시 삭제됐어요."
            : "30일 이내에 다시 로그인하면 계정을 복구할 수 있어요. 그 뒤에는 완전히 삭제됩니다."}
        </p>
        <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/">
          홈으로
        </Link>
      </main>
    );
  }

  if (authStatus === "anonymous") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 px-5 py-10 text-foreground sm:px-8">
        <p className="leading-7 text-muted">로그인 후 이용할 수 있어요.</p>
        <Button href="/login">로그인</Button>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-5 py-10 text-foreground sm:px-8">
      <div className="space-y-3">
        <p className="text-sm text-muted">온설</p>
        <h1 className="text-2xl font-semibold tracking-normal">회원탈퇴</h1>
      </div>

      <div className="space-y-3 rounded-lg border border-line bg-surface p-4 text-sm leading-6 text-muted">
        <p>
          탈퇴하면 즉시 로그아웃되고, 이메일·닉네임·비밀번호가 삭제됩니다.
          다만 남긴 고민과 답변은 지워지지 않고 익명 처리되어 남아요 — 다른
          사람이 함께 남긴 내용이기 때문이에요.
        </p>
        <p>
          기본적으로는 <strong className="text-foreground">30일의 유예기간</strong>을
          두고, 그 안에 다시 로그인하면 계정을 복구할 수 있어요. 유예기간이
          지나면 자동으로 완전히 삭제됩니다.
        </p>
      </div>

      <Toggle
        checked={immediate}
        label="유예기간 없이 즉시 영구 삭제 (복구 불가)"
        onChange={setImmediate}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button href="/me" variant="secondary">
          취소
        </Button>
        <Button
          disabled={showSpinner}
          pending={showSpinner}
          onClick={() => setConfirmOpen(true)}
        >
          탈퇴하기
        </Button>
      </div>

      <ActionConfirmDialog
        confirmLabel={immediate ? "즉시 삭제" : "탈퇴하기"}
        message={
          immediate
            ? "정말 즉시 영구 삭제할까요? 되돌릴 수 없어요."
            : "정말 탈퇴할까요? 30일 이내에 로그인하면 복구할 수 있어요."
        }
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirm()}
      />
    </main>
  );
}
