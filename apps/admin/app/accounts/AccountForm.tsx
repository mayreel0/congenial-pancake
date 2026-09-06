"use client";

import { useState, type FormEvent } from "react";
import { Button } from "ui/Button";
import { TextField } from "ui/TextField";
import type { useAccountsAdmin } from "./useAccountsAdmin";

type AccountFormProps = {
  issuing: boolean;
  issueError: string | null;
  url: string | null;
  issueLink: ReturnType<typeof useAccountsAdmin>["issueLink"];
  reset: ReturnType<typeof useAccountsAdmin>["reset"];
};

// One-off way to give an OAuth-only account a password (e.g. so it can log
// into this app standalone) — see docs/decisions/2026-08-27-onseol-oauth-
// password-reset-decisions.md. No email sending: the link is shown here for
// the admin to copy and open themselves.
export function AccountForm({
  issuing,
  issueError,
  url,
  issueLink,
  reset,
}: AccountFormProps) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setCopied(false);
    await issueLink(email);
  }

  async function handleCopy(): Promise<void> {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard permission denied/unavailable — the link is still
      // visible on screen to copy manually.
    }
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-foreground">계정</h1>
      <div className="space-y-6">
        <form
          className="space-y-3"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <TextField
            hint="비밀번호가 없는 계정(OAuth로만 로그인하던 계정)에 비밀번호를 설정할 수 있는 일회성 링크를 발급합니다."
            id="email"
            label="이메일"
            required
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.currentTarget.value);
              reset();
              setCopied(false);
            }}
          />

          {issueError && (
            <p className="text-sm text-red-600">{issueError}</p>
          )}

          <Button disabled={issuing} type="submit">
            {issuing ? "발급 중" : "링크 발급"}
          </Button>
        </form>

        {url && (
          <div className="space-y-2 rounded-lg border border-line bg-surface p-4">
            <p className="break-all text-sm text-foreground">{url}</p>
            <div className="flex items-center gap-3">
              <button
                className="text-sm text-muted transition hover:text-foreground"
                type="button"
                onClick={() => void handleCopy()}
              >
                복사
              </button>
              {copied && (
                <span className="text-sm text-primary">복사했어요.</span>
              )}
            </div>
            <p className="text-xs text-muted">
              30분간 유효하며, 한 번 사용하면 만료됩니다.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
