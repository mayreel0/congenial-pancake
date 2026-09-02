"use client";

import { Skeleton } from "ui/Skeleton";
import { useLandingStatsQuery } from "../../lib/landing/queries";

type StatCellProps = {
  label: string;
  value: number;
};

function StatCell({ label, value }: StatCellProps) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3 shadow-sm">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function StatCellSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-line bg-surface px-4 py-3 shadow-sm">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-7 w-10" />
    </div>
  );
}

// A public marketing section — a failed fetch just hides this rather than
// showing an error, so a network hiccup never breaks the landing page.
// Five cells total, grouped as two rows (cumulative totals, then today's
// activity + the current waiting-for-reply count) — a "이번 달" middle
// tier used to sit between these but felt like empty filler without a
// caption under each cell, so it was dropped rather than re-adding copy.
export function ActivityStats() {
  const { data, isPending, isError } = useLandingStatsQuery();

  if (isError) return null;

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-3">
        {isPending ? (
          <>
            <StatCellSkeleton />
            <StatCellSkeleton />
          </>
        ) : (
          <>
            <StatCell label="누적 위로 요청" value={data.requests.total} />
            <StatCell label="누적 답장" value={data.replies.total} />
          </>
        )}
      </dl>
      <dl className="grid grid-cols-3 gap-3">
        {isPending ? (
          <>
            <StatCellSkeleton />
            <StatCellSkeleton />
            <StatCellSkeleton />
          </>
        ) : (
          <>
            <StatCell label="오늘의 위로 요청" value={data.requests.today} />
            <StatCell label="오늘의 답장" value={data.replies.today} />
            <StatCell label="답변을 기다리는 글" value={data.waitingForReply} />
          </>
        )}
      </dl>
    </div>
  );
}
