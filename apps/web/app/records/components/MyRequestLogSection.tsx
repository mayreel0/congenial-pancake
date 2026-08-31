import { Button } from "ui/Button";
import { Pagination } from "ui/Pagination";
import { Skeleton } from "ui/Skeleton";
import { PAGE_SIZE_OPTIONS } from "../../lib/pagination";
import type { MyRequestLogEntryDto } from "../../lib/requests/api";
import { useMyRequestLogQuery } from "../../lib/requests/queries";
import { useDateRangePage } from "../useDateRangePage";
import { DateRangeFilter } from "./DateRangeFilter";
import { RequestLogCard } from "./RequestLogCard";

type RequestLogBodyProps = {
  loading: boolean;
  entries: MyRequestLogEntryDto[];
};

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function RequestLogBody({ loading, entries }: RequestLogBodyProps) {
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
        <RequestLogCard entry={entry} key={entry.request.id} />
      ))}
    </ol>
  );
}

export function MyRequestLogSection() {
  const { from, to, page, pageSize, setFrom, setTo, setPage, setPageSize } =
    useDateRangePage("req");
  const requestLog = useMyRequestLogQuery(from, to, page, pageSize);
  const data = requestLog.data;

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
      <DateRangeFilter
        from={from}
        idPrefix="request-log"
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
      />
      <RequestLogBody
        entries={data?.items ?? []}
        loading={requestLog.isPending || requestLog.isLoading}
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
