"use client";

import { useState } from "react";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { Skeleton } from "ui/Skeleton";
import { Toast } from "ui/Toast";
import { useToast } from "ui/useToast";
import {
  SKELETON_MIN_DISPLAY_MS,
  useMinDisplayDuration,
} from "ui/useMinDisplayDuration";
import { AdminNav } from "./components/AdminNav";
import { AdminStatusGate } from "./components/AdminStatusGate";
import { useAuth } from "./lib/auth/useAuth";
import { formatTimestamp } from "utils";
import { useAdminReview } from "./useAdminReview";

type PendingDelete =
  | { kind: "request"; id: string }
  | { kind: "reply"; id: string };

type ReviewBodyProps = {
  isLoadingQueue: boolean;
  hiddenRequests: ReturnType<typeof useAdminReview>["hiddenRequests"];
  hiddenReplies: ReturnType<typeof useAdminReview>["hiddenReplies"];
  onRestoreRequest(id: string): void;
  onDeleteRequest(id: string): void;
  onRestoreReply(id: string): void;
  onDeleteReply(id: string): void;
};

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function ReviewBody({
  isLoadingQueue,
  hiddenRequests,
  hiddenReplies,
  onRestoreRequest,
  onDeleteRequest,
  onRestoreReply,
  onDeleteReply,
}: ReviewBodyProps) {
  const showSkeleton = useMinDisplayDuration(
    isLoadingQueue,
    SKELETON_MIN_DISPLAY_MS,
  );

  if (showSkeleton) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((key) => (
          <div
            className="space-y-2 rounded-lg border border-line bg-surface px-4 py-3"
            key={key}
          >
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (hiddenRequests.length === 0 && hiddenReplies.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted">
        검토할 항목이 없어요.
      </p>
    );
  }

  return (
    <>
      {hiddenRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">
            요청 ({hiddenRequests.length})
          </h2>
          <ul className="space-y-3">
            {hiddenRequests.map((request) => (
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
                      onClick={() => onRestoreRequest(request.id)}
                    >
                      복구
                    </button>
                    <button
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold text-red-600 transition hover:bg-surface-muted"
                      type="button"
                      onClick={() => onDeleteRequest(request.id)}
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

      {hiddenReplies.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">
            답변 ({hiddenReplies.length})
          </h2>
          <ul className="space-y-3">
            {hiddenReplies.map((reply) => (
              <li
                className="space-y-2 rounded-lg border border-line bg-surface px-4 py-3"
                key={reply.id}
              >
                <p className="text-xs text-muted">원글: {reply.requestBody}</p>
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
                      onClick={() => onRestoreReply(reply.id)}
                    >
                      복구
                    </button>
                    <button
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold text-red-600 transition hover:bg-surface-muted"
                      type="button"
                      onClick={() => onDeleteReply(reply.id)}
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
  );
}

export function AdminReview() {
  const auth = useAuth();
  const review = useAdminReview();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const { toast, showSuccess, showError, dismiss } = useToast();

  // The confirm dialog closes the instant "영구 삭제" is confirmed, before
  // this resolves — deliberately unchanged (see docs/decisions — program-
  // wide UX audit, 2026-09-09) — a failure now at least surfaces as a
  // toast instead of vanishing silently.
  async function confirmPendingDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);

    try {
      if (target.kind === "request") {
        await review.deleteRequest(target.id);
      } else {
        await review.deleteReply(target.id);
      }
      showSuccess("영구 삭제했어요.");
    } catch (error) {
      showError(error);
    }
  }

  async function handleRestoreRequest(id: string) {
    try {
      await review.restoreRequest(id);
      showSuccess("복구했어요.");
    } catch (error) {
      showError(error);
    }
  }

  async function handleRestoreReply(id: string) {
    try {
      await review.restoreReply(id);
      showSuccess("복구했어요.");
    } catch (error) {
      showError(error);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AdminNav activePath="/" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        <h1 className="text-lg font-semibold text-foreground">신고 검토</h1>
        <AdminStatusGate status={review.status} login={auth.login}>
          <ReviewBody
            hiddenReplies={review.hiddenReplies}
            hiddenRequests={review.hiddenRequests}
            isLoadingQueue={review.isLoadingQueue}
            onDeleteReply={(id) => setPendingDelete({ kind: "reply", id })}
            onDeleteRequest={(id) => setPendingDelete({ kind: "request", id })}
            onRestoreReply={(id) => void handleRestoreReply(id)}
            onRestoreRequest={(id) => void handleRestoreRequest(id)}
          />
        </AdminStatusGate>
      </main>
      <ActionConfirmDialog
        confirmLabel="영구 삭제"
        message="영구 삭제할까요? 되돌릴 수 없어요."
        open={pendingDelete !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmPendingDelete()}
      />
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
