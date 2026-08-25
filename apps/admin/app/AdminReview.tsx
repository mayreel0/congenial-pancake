"use client";

import { useState, type FormEvent } from "react";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { ApiError } from "./lib/api";
import { useAuth } from "./lib/auth/useAuth";
import { formatTimestamp } from "utils";
import { useAdminReview } from "./useAdminReview";

type PendingDelete =
  | { kind: "request"; id: string }
  | { kind: "reply"; id: string };

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
};

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return LOGIN_ERROR_MESSAGES[error.code] ?? error.message;
  }
  return "로그인하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

function LoginForm({ login }: { login(email: string, password: string): Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
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
      <div className="space-y-1">
        <label className="text-sm text-muted" htmlFor="email">
          이메일
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary"
          id="email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-muted" htmlFor="password">
          비밀번호
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary"
          id="password"
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? "로그인 중" : "로그인"}
      </button>
    </form>
  );
}

export function AdminReview() {
  const auth = useAuth();
  const review = useAdminReview();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );

  async function confirmPendingDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);

    if (target.kind === "request") {
      await review.deleteRequest(target.id);
    } else {
      await review.deleteReply(target.id);
    }
  }

  const isEmpty =
    review.hiddenRequests.length === 0 && review.hiddenReplies.length === 0;

  return (
    // The header renders unconditionally, regardless of review.status — it
    // reads the same auth query this page does, so gating its mount on that
    // query's own loading state would mount/unmount it every time the query
    // refetches on (re)mount, which retriggers another refetch, forever. See
    // docs/decisions/2026-08-25-onseol-admin-app-split-decisions.md.
    <div className="min-h-dvh bg-background text-foreground">
      <header className="flex h-14 items-center justify-between border-b border-line px-5 sm:px-8">
        <p className="text-sm font-semibold text-foreground">온설 관리</p>
        {auth.status === "authenticated" ? (
          <button
            className="text-sm text-muted transition hover:text-foreground"
            type="button"
            onClick={() => void auth.logout()}
          >
            로그아웃
          </button>
        ) : null}
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        {review.status === "loading" ? null : review.status === "signedOut" ? (
          <LoginForm login={auth.login} />
        ) : review.status === "forbidden" ? (
          <p className="py-16 text-center text-sm text-muted">
            이 계정은 접근 권한이 없어요.
          </p>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-foreground">신고 검토</h1>

            {isEmpty ? (
              <p className="py-16 text-center text-sm text-muted">
                검토할 항목이 없어요.
              </p>
            ) : (
              <>
                {review.hiddenRequests.length > 0 ? (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted">
                      요청 ({review.hiddenRequests.length})
                    </h2>
                    <ul className="space-y-3">
                      {review.hiddenRequests.map((request) => (
                        <li
                          className="space-y-2 rounded-lg border border-line bg-surface px-4 py-3"
                          key={request.id}
                        >
                          <p className="text-sm leading-6 text-foreground">
                            {request.body}
                          </p>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-muted">
                              {formatTimestamp(request.createdAt)} · 신고{" "}
                              {request.reportCount}건
                            </p>
                            <div className="flex shrink-0 gap-2">
                              <button
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
                                type="button"
                                onClick={() =>
                                  void review.restoreRequest(request.id)
                                }
                              >
                                복구
                              </button>
                              <button
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold text-red-600 transition hover:bg-surface-muted"
                                type="button"
                                onClick={() =>
                                  setPendingDelete({
                                    kind: "request",
                                    id: request.id,
                                  })
                                }
                              >
                                영구 삭제
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {review.hiddenReplies.length > 0 ? (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted">
                      답변 ({review.hiddenReplies.length})
                    </h2>
                    <ul className="space-y-3">
                      {review.hiddenReplies.map((reply) => (
                        <li
                          className="space-y-2 rounded-lg border border-line bg-surface px-4 py-3"
                          key={reply.id}
                        >
                          <p className="text-xs text-muted">
                            원글: {reply.requestBody}
                          </p>
                          <p className="text-sm leading-6 text-foreground">
                            {reply.body}
                          </p>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-muted">
                              {formatTimestamp(reply.createdAt)} · 신고{" "}
                              {reply.reportCount}건
                            </p>
                            <div className="flex shrink-0 gap-2">
                              <button
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
                                type="button"
                                onClick={() => void review.restoreReply(reply.id)}
                              >
                                복구
                              </button>
                              <button
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold text-red-600 transition hover:bg-surface-muted"
                                type="button"
                                onClick={() =>
                                  setPendingDelete({ kind: "reply", id: reply.id })
                                }
                              >
                                영구 삭제
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </>
        )}
      </main>
      <ActionConfirmDialog
        confirmLabel="영구 삭제"
        message="영구 삭제할까요? 되돌릴 수 없어요."
        open={pendingDelete !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmPendingDelete()}
      />
    </div>
  );
}
