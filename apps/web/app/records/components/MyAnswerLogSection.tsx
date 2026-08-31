import { Button } from "ui/Button";
import { Pagination } from "ui/Pagination";
import { Skeleton } from "ui/Skeleton";
import { PAGE_SIZE_OPTIONS } from "../../lib/pagination";
import type { MyAnswerLogEntryDto } from "../../lib/replies/api";
import { useMyAnswerLogQuery } from "../../lib/replies/queries";
import { useDateRangePage } from "../useDateRangePage";
import { AnswerLogCard } from "./AnswerLogCard";
import { DateRangeFilter } from "./DateRangeFilter";

type AnswerLogBodyProps = {
  loading: boolean;
  entries: MyAnswerLogEntryDto[];
};

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function AnswerLogBody({ loading, entries }: AnswerLogBodyProps) {
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
        <AnswerLogCard entry={entry} key={entry.replyId} />
      ))}
    </ol>
  );
}

export function MyAnswerLogSection() {
  const { from, to, page, pageSize, setFrom, setTo, setPage, setPageSize } =
    useDateRangePage("rep");
  const answerLog = useMyAnswerLogQuery(from, to, page, pageSize);
  const data = answerLog.data;

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
      <DateRangeFilter
        from={from}
        idPrefix="answer-log"
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
      />
      <AnswerLogBody
        entries={data?.items ?? []}
        loading={answerLog.isPending || answerLog.isLoading}
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
    </section>
  );
}
