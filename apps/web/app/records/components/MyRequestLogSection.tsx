import { useState } from "react";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { Button } from "ui/Button";
import { HeatmapCalendarField } from "ui/HeatmapCalendarField";
import { Pagination } from "ui/Pagination";
import { Skeleton } from "ui/Skeleton";
import { Toast } from "ui/Toast";
import { useToast } from "ui/useToast";
import { daysInMonthAnchor, formatKoreanDate } from "../../lib/kst-date";
import { PAGE_SIZE_OPTIONS } from "../../lib/pagination";
import type { MyRequestLogEntryDto } from "../../lib/requests/api";
import {
  useDeleteOwnRequestMutation,
  useMyRequestDayCountsQuery,
  useMyRequestLogQuery,
} from "../../lib/requests/queries";
import { useDateRangePage } from "../useDateRangePage";
import { RequestLogCard } from "./RequestLogCard";

type RequestLogBodyProps = {
  loading: boolean;
  entries: MyRequestLogEntryDto[];
  onDeleteRequest(requestId: string): void;
};

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function RequestLogBody({ loading, entries, onDeleteRequest }: RequestLogBodyProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((key) => (
          <div
            className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm"
            key={key}
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
        <p className="text-sm text-muted">아직 남긴 고민이 없습니다.</p>
        <Button href="/today" size="sm">
          고민 남기러 가기
        </Button>
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => (
        <RequestLogCard
          entry={entry}
          key={entry.request.id}
          onDeleteRequest={onDeleteRequest}
        />
      ))}
    </ol>
  );
}

export function MyRequestLogSection() {
  const {
    from,
    to,
    page,
    pageSize,
    setFrom,
    setTo,
    setPage,
    setPageSize,
    calendarMonth,
    setCalendarMonth,
  } = useDateRangePage("req");
  const requestLog = useMyRequestLogQuery(from, to, page, pageSize);
  const data = requestLog.data;
  const monthDays = daysInMonthAnchor(calendarMonth);
  const dayCounts = useMyRequestDayCountsQuery(
    monthDays[0],
    monthDays[monthDays.length - 1],
  );
  const deleteRequest = useDeleteOwnRequestMutation();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { toast, showError, dismiss } = useToast();

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await deleteRequest.mutateAsync(id);
    } catch (error) {
      showError(error);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="my-request-log-heading">
      <div className="space-y-1">
        <h2
          className="text-lg font-semibold tracking-normal"
          id="my-request-log-heading"
        >
          내가 남긴 고민
        </h2>
        <p className="text-sm text-muted">
          내가 남긴 고민과 거기 달린 답변을 모아봤어요.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <HeatmapCalendarField
          counts={dayCounts.data?.days ?? []}
          formatDate={formatKoreanDate}
          label="시작일"
          maxDate={to}
          month={calendarMonth}
          placeholder="시작일을 선택하세요"
          selected={from}
          onMonthChange={setCalendarMonth}
          onSelect={setFrom}
        />
        <HeatmapCalendarField
          counts={dayCounts.data?.days ?? []}
          formatDate={formatKoreanDate}
          label="종료일"
          minDate={from}
          month={calendarMonth}
          placeholder="종료일을 선택하세요"
          selected={to}
          onMonthChange={setCalendarMonth}
          onSelect={setTo}
        />
      </div>
      <RequestLogBody
        entries={data?.items ?? []}
        loading={requestLog.isPending || requestLog.isLoading}
        onDeleteRequest={setPendingDeleteId}
      />
      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          totalPages={data.totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
      <ActionConfirmDialog
        confirmLabel="삭제하기"
        message="이 글을 삭제할까요? 삭제하면 글 내용은 사라지고, 이미 달린 답변은 그대로 남아요."
        open={pendingDeleteId !== null}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
      <Toast toast={toast} onDismiss={dismiss} />
    </section>
  );
}
