"use client";

import { useState } from "react";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { AdminNav } from "./components/AdminNav";
import { AdminStatusGate } from "./components/AdminStatusGate";
import { useAuth } from "./lib/auth/useAuth";
import { formatTimestamp } from "utils";
import { useAdminReview } from "./useAdminReview";

type PendingDelete =
  | { kind: "request"; id: string }
  | { kind: "reply"; id: string };

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
    <div className="min-h-dvh bg-background text-foreground">
      <AdminNav activePath="/" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        <AdminStatusGate status={review.status} login={auth.login}>
          <h1 className="text-lg font-semibold text-foreground">신고 검토</h1>

          {isEmpty ? (
            <p className="py-16 text-center text-sm text-muted">
              검토할 항목이 없어요.
            </p>
          ) : (
            <>
              {review.hiddenRequests.length > 0 && (
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
              )}

              {review.hiddenReplies.length > 0 && (
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
              )}
            </>
          )}
        </AdminStatusGate>
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
