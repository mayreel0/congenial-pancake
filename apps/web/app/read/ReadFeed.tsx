"use client";

import { useState } from "react";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { HeatmapCalendarField } from "ui/HeatmapCalendarField";
import { Pagination } from "ui/Pagination";
import { Skeleton } from "ui/Skeleton";
import { toast } from "ui/useToast";
import { buildFeedItemLabels } from "../lib/feed-item-labels";
import { formatKoreanDate } from "../lib/kst-date";
import { PAGE_SIZE_OPTIONS } from "../lib/pagination";
import { ReadThread } from "./components/ReadThread";
import { useReadFeed } from "./useReadFeed";

type PendingReport =
  | { kind: "request"; requestId: string }
  | { kind: "reply"; requestId: string; replyId: string };

type ReadFeedBodyProps = {
  feed: ReturnType<typeof useReadFeed>;
  savedSet: Set<string>;
  onReportRequest(requestId: string): void;
  onReportReply(requestId: string, replyId: string): void;
  onToggleSaveReply(replyId: string): void;
};

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

  const savedSet = new Set(feed.savedReplyIds);

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
      toast.success("신고했어요.");
    } catch (error) {
      toast.error(error);
    }
  }

  async function toggleSavedReply(replyId: string) {
    try {
      await feed.toggleSavedReply(replyId);
    } catch (error) {
      toast.error(error);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/read" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-10 sm:px-8">
        <section className="space-y-3">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            온설 읽기
          </h1>
        </section>
        <HeatmapCalendarField
          counts={feed.dayCounts}
          formatDate={formatKoreanDate}
          label="날짜"
          maxDate={feed.maxSelectableDate}
          month={feed.calendarMonth}
          placeholder="날짜를 선택하세요"
          selected={feed.currentDate}
          onMonthChange={feed.setCalendarMonth}
          onSelect={feed.goToDate}
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
          pageSize={feed.pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          totalPages={feed.totalPages}
          onPageChange={feed.setPage}
          onPageSizeChange={feed.setPageSize}
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
    </div>
  );
}
