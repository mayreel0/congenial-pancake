"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { Pagination } from "ui/Pagination";
import { Skeleton } from "ui/Skeleton";
import { DayNav } from "./components/DayNav";
import { ReadThread } from "./components/ReadThread";
import { buildFeedItemLabels } from "./labels";
import { useReadFeed } from "./useReadFeed";

type PendingReport =
  | { kind: "request"; requestId: string }
  | { kind: "reply"; requestId: string; replyId: string };

const TOAST_VISIBLE_MS = 2000;

const ERROR_MESSAGES: Record<string, string> = {
  REPORT_ALREADY_SUBMITTED: "이미 신고한 항목이에요.",
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.";
  }
  return "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.";
}

type ReadFeedBodyProps = {
  feed: ReturnType<typeof useReadFeed>;
  savedSet: Set<string>;
  onReportRequest(requestId: string): void;
  onReportReply(requestId: string, replyId: string): void;
  onToggleSaveReply(replyId: string): void;
};

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function ReadFeedBody({
  feed,
  savedSet,
  onReportRequest,
  onReportReply,
  onToggleSaveReply,
}: ReadFeedBodyProps) {
  if (feed.isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((key) => (
          <div
            className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm"
            key={key}
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (feed.readFeed.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted">
        이 날 읽을 수 있는 온설이 없어요.
      </p>
    );
  }

  return (
    <>
      {feed.readFeed.map((item) => (
        <ReadThread
          authorLabels={buildFeedItemLabels(item)}
          item={item}
          key={item.request.id}
          savedReplyIds={savedSet}
          showActions={feed.canManage}
          onReportReply={(replyId) => onReportReply(item.request.id, replyId)}
          onReportRequest={() => onReportRequest(item.request.id)}
          onToggleSaveReply={onToggleSaveReply}
        />
      ))}
    </>
  );
}

export function ReadFeed() {
  const feed = useReadFeed();
  const [pendingReport, setPendingReport] = useState<PendingReport | null>(
    null,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const savedSet = new Set(feed.savedReplyIds);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showErrorToast(error: unknown) {
    setToastMessage(errorMessage(error));

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, TOAST_VISIBLE_MS);
  }

  function dismissToast() {
    setToastMessage(null);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }

  async function confirmPendingReport() {
    if (!pendingReport) return;
    const report = pendingReport;
    setPendingReport(null);

    try {
      if (report.kind === "request") {
        await feed.reportRequest(report.requestId);
      } else {
        await feed.reportReply(report.replyId);
      }
    } catch (error) {
      showErrorToast(error);
    }
  }

  async function toggleSavedReply(replyId: string) {
    try {
      await feed.toggleSavedReply(replyId);
    } catch (error) {
      showErrorToast(error);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/read" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-10 sm:px-8">
        <DayNav
          canGoNext={feed.canGoToNextDay}
          date={feed.currentDate}
          onNext={feed.goToNextDay}
          onPrevious={feed.goToPreviousDay}
        />
        <ReadFeedBody
          feed={feed}
          savedSet={savedSet}
          onReportReply={(requestId, replyId) =>
            setPendingReport({ kind: "reply", requestId, replyId })
          }
          onReportRequest={(requestId) =>
            setPendingReport({ kind: "request", requestId })
          }
          onToggleSaveReply={(replyId) => void toggleSavedReply(replyId)}
        />
        <Pagination
          page={feed.page}
          totalPages={feed.totalPages}
          onPageChange={feed.setPage}
        />
      </main>
      <ActionConfirmDialog
        confirmLabel="신고하기"
        message={
          pendingReport?.kind === "reply"
            ? "이 답변을 신고할까요? 신고하면 이 답변은 더 이상 보이지 않아요."
            : "이 온설을 신고할까요? 신고하면 이 글은 읽기 목록에서 사라집니다."
        }
        open={pendingReport !== null}
        onCancel={() => setPendingReport(null)}
        onConfirm={() => void confirmPendingReport()}
      />
      {toastMessage ? (
        <div
          className="fixed bottom-5 left-1/2 z-10 flex w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm shadow-sm sm:bottom-8 sm:w-auto sm:min-w-64"
          role="status"
        >
          <span className="text-red-600">{toastMessage}</span>
          <button
            aria-label="알림 닫기"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-muted transition hover:bg-surface-muted hover:text-foreground"
            type="button"
            onClick={dismissToast}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
