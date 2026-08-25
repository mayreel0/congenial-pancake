"use client";

import Link from "next/link";
import { useState } from "react";
import { landingEntryLinks } from "../components/navigation/routes";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { ActionConfirmDialog } from "../components/shared/ActionConfirmDialog";
import { formatTimestamp } from "../lib/format";
import { useAdminReview } from "./useAdminReview";

type PendingDelete =
  | { kind: "request"; id: string }
  | { kind: "reply"; id: string };

export function AdminReview() {
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
    // ServiceNav mounts unconditionally, regardless of review.status — it
    // reads the same auth query this page does, so gating its mount on that
    // query's own loading state would mount/unmount it every time the query
    // refetches on (re)mount, which retriggers another refetch, forever.
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/admin" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        {review.status === "loading" ? null : review.status === "signedOut" ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted">로그인이 필요한 페이지예요.</p>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              href={landingEntryLinks.login}
            >
              로그인
            </Link>
          </div>
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
