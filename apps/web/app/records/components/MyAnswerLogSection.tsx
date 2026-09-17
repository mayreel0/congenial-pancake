import { useEffect, useState } from "react";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { Button } from "ui/Button";
import { HeatmapCalendarField } from "ui/HeatmapCalendarField";
import { Pagination } from "ui/Pagination";
import { Skeleton } from "ui/Skeleton";
import { TextField } from "ui/TextField";
import { useDebouncedValue } from "ui/useDebouncedValue";
import { toast } from "ui/useToast";
import { daysInMonthAnchor, formatKoreanDate } from "../../lib/kst-date";
import { PAGE_SIZE_OPTIONS } from "../../lib/pagination";
import type { MyAnswerLogEntryDto } from "../../lib/replies/api";
import {
  useDeleteOwnReplyMutation,
  useMyAnswerLogQuery,
  useMyReplyDayCountsQuery,
} from "../../lib/replies/queries";
import { useDateRangePage } from "../useDateRangePage";
import { AnswerLogCard } from "./AnswerLogCard";

type AnswerLogBodyProps = {
  loading: boolean;
  entries: MyAnswerLogEntryDto[];
  searching: boolean;
  onDeleteReply(requestId: string, replyId: string): void;
};

function AnswerLogBody({
  loading,
  entries,
  searching,
  onDeleteReply,
}: AnswerLogBodyProps) {
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

  if (entries.length === 0 && searching) {
    return (
      <div className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
        <p className="text-sm text-muted">검색 결과가 없습니다.</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
        <p className="text-sm text-muted">아직 남긴 답변이 없습니다.</p>
        <Button href="/answer" size="sm">
          답변 남기러 가기
        </Button>
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => (
        <AnswerLogCard
          entry={entry}
          key={entry.replyId}
          onDeleteReply={onDeleteReply}
        />
      ))}
    </ol>
  );
}

export function MyAnswerLogSection() {
  const {
    from,
    to,
    q,
    page,
    pageSize,
    setFrom,
    setTo,
    setQ,
    setPage,
    setPageSize,
    calendarMonth,
    setCalendarMonth,
  } = useDateRangePage("rep");
  // Local echo for instant typing feedback — setQ (URL-synced) only fires
  // once debouncedQInput settles, so a request isn't sent per keystroke.
  // Local echo for instant typing feedback — setQ (URL-synced) only fires
  // once debouncedQInput settles, so a request isn't sent per keystroke.
  const [qInput, setQInput] = useState(q ?? "");
  // Adjust-state-during-render (not a useEffect — see React's "Adjusting
  // state when a prop changes" guide) to pull qInput back in sync when q
  // changes from outside typing, e.g. browser back/forward through repQ.
  // Comparing against the *previous* q (not the current committed value
  // below) means an in-progress keystroke, which hasn't reached q yet,
  // is never clobbered by this.
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setQInput(q ?? "");
  }
  const debouncedQInput = useDebouncedValue(qInput, 300);
  useEffect(() => {
    const next = debouncedQInput.trim() || undefined;
    if (next !== q) setQ(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setQ is stable across renders; only debouncedQInput should retrigger this (comparing against q would refire on every setQ-caused rerender)
  }, [debouncedQInput]);
  const answerLog = useMyAnswerLogQuery(from, to, page, pageSize, q);
  const data = answerLog.data;
  const monthDays = daysInMonthAnchor(calendarMonth);
  const dayCounts = useMyReplyDayCountsQuery(
    monthDays[0],
    monthDays[monthDays.length - 1],
  );
  const deleteReply = useDeleteOwnReplyMutation();
  const [pendingDelete, setPendingDelete] = useState<{
    requestId: string;
    replyId: string;
  } | null>(null);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteReply.mutateAsync(target);
      toast.success("삭제했어요.");
    } catch (error) {
      toast.error(error);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="my-answer-log-heading">
      <div className="space-y-1">
        <h2
          className="text-lg font-semibold tracking-normal"
          id="my-answer-log-heading"
        >
          내가 남긴 답변
        </h2>
        <p className="text-sm text-muted">
          내가 어떤 온설에 어떤 답을 남겼는지 모아봤어요.
        </p>
      </div>
      {/* A dedicated @container wrapper, separate from the row it
          contains — an element can't container-query its own size, so
          the row's @min-[740px]:flex-row below needs an ancestor (this
          div) with container-type set, not itself. See
          ui/filterRowBreakpoint.ts. */}
      <div className="@container">
        <div className="flex flex-col gap-3 @min-[740px]:flex-row @min-[740px]:flex-wrap">
          <TextField
            breakpoint="740"
            id="my-answer-log-search"
            label="검색"
            placeholder="본문 검색어"
            value={qInput}
            width="search"
            onChange={(event) => setQInput(event.target.value)}
          />
          <HeatmapCalendarField
            breakpoint="740"
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
            breakpoint="740"
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
      </div>
      <AnswerLogBody
        entries={data?.items ?? []}
        loading={answerLog.isPending || answerLog.isLoading}
        searching={Boolean(q)}
        onDeleteReply={(requestId, replyId) =>
          setPendingDelete({ requestId, replyId })
        }
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
        message="이 답변을 삭제할까요? 삭제한 답변은 더 이상 보이지 않아요."
        open={pendingDelete !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
