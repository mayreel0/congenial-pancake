"use client";

import { useState } from "react";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { Skeleton } from "ui/Skeleton";
import { toast } from "ui/useToast";
import {
  SKELETON_MIN_DISPLAY_MS,
  useMinDisplayDuration,
} from "ui/useMinDisplayDuration";
import { AdminShell } from "./components/AdminShell";
import { AdminStatusGate } from "./components/AdminStatusGate";
import { useAdminAccess } from "./lib/admin/useAdminAccess";
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

type RowActionsProps = {
  onRestore(): void;
  onDelete(): void;
};

function RowActions({ onRestore, onDelete }: RowActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <button
        className="inline-flex h-8 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
        type="button"
        onClick={onRestore}
      >
        복구
      </button>
      <button
        className="inline-flex h-8 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold text-red-600 transition hover:bg-surface-muted"
        type="button"
        onClick={onDelete}
      >
        영구 삭제
      </button>
    </div>
  );
}

const TH_CLASS =
  "border-b border-line px-3 py-2 text-left text-xs font-semibold text-muted";
const TD_CLASS = "border-b border-line px-3 py-3 align-top text-sm";

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
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH_CLASS}>내용</th>
                  <th className={`${TH_CLASS} whitespace-nowrap`}>작성일</th>
                  <th className={`${TH_CLASS} whitespace-nowrap`}>신고</th>
                  <th className={`${TH_CLASS} text-right`}>액션</th>
                </tr>
              </thead>
              <tbody>
                {hiddenRequests.map((request) => (
                  <tr key={request.id}>
                    <td className={`${TD_CLASS} text-foreground`}>
                      {request.body}
                    </td>
                    <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>
                      {formatTimestamp(request.createdAt)}
                    </td>
                    <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>
                      {request.reportCount}건
                    </td>
                    <td className={TD_CLASS}>
                      <RowActions
                        onDelete={() => onDeleteRequest(request.id)}
                        onRestore={() => onRestoreRequest(request.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {hiddenReplies.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">
            답변 ({hiddenReplies.length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH_CLASS}>원글</th>
                  <th className={TH_CLASS}>답변 내용</th>
                  <th className={`${TH_CLASS} whitespace-nowrap`}>작성일</th>
                  <th className={`${TH_CLASS} whitespace-nowrap`}>신고</th>
                  <th className={`${TH_CLASS} text-right`}>액션</th>
                </tr>
              </thead>
              <tbody>
                {hiddenReplies.map((reply) => (
                  <tr key={reply.id}>
                    <td className={`${TD_CLASS} text-muted`}>
                      {reply.requestBody}
                    </td>
                    <td className={`${TD_CLASS} text-foreground`}>
                      {reply.body}
                    </td>
                    <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>
                      {formatTimestamp(reply.createdAt)}
                    </td>
                    <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>
                      {reply.reportCount}건
                    </td>
                    <td className={TD_CLASS}>
                      <RowActions
                        onDelete={() => onDeleteReply(reply.id)}
                        onRestore={() => onRestoreReply(reply.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

export function AdminReview() {
  const access = useAdminAccess();
  const review = useAdminReview();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );

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
      toast.success("영구 삭제했어요.");
    } catch (error) {
      toast.error(error);
    }
  }

  async function handleRestoreRequest(id: string) {
    try {
      await review.restoreRequest(id);
      toast.success("복구했어요.");
    } catch (error) {
      toast.error(error);
    }
  }

  async function handleRestoreReply(id: string) {
    try {
      await review.restoreReply(id);
      toast.success("복구했어요.");
    } catch (error) {
      toast.error(error);
    }
  }

  return (
    <AdminShell activePath="/review">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-10 sm:px-8">
        <h1 className="text-lg font-semibold text-foreground">신고 검토</h1>
        <AdminStatusGate status={access.status}>
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
    </AdminShell>
  );
}
