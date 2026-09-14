"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Skeleton } from "ui/Skeleton";
import {
  SKELETON_MIN_DISPLAY_MS,
  useMinDisplayDuration,
} from "ui/useMinDisplayDuration";
import { ApiError } from "../../../lib/api";
import { buildFeedItemLabels } from "../../../lib/feed-item-labels";
import { useMyRequestThreadQuery } from "../../../lib/requests/queries";
import { ReadThread } from "../../../read/components/ReadThread";

type RequestDetailBodyProps = {
  query: ReturnType<typeof useMyRequestThreadQuery>;
  replyId: string | undefined;
};

function RequestDetailBody({ query, replyId }: RequestDetailBodyProps) {
  const showSkeleton = useMinDisplayDuration(
    query.isPending,
    SKELETON_MIN_DISPLAY_MS,
  );

  if (showSkeleton) {
    return (
      <div className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }

  if (query.isError) {
    const notFound =
      query.error instanceof ApiError && query.error.statusCode === 404;
    return (
      <p className="max-w-xl leading-7 text-muted">
        {notFound
          ? "존재하지 않는 글입니다."
          : "글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."}
      </p>
    );
  }

  const item = query.data;
  if (!item) return null;

  // 내 글의 스레드 상세 — 신고/저장 액션은 /records 목록에서만 필요하므로
  // /u/[slug]의 공개 상세 페이지와 마찬가지로 showActions={false}.
  // highlightReplyId는 알림에서 딥링크로 넘어왔을 때 해당 답장 하나를
  // 강조 표시한다.
  return (
    <ReadThread
      authorLabels={buildFeedItemLabels(item)}
      highlightReplyId={replyId}
      item={item}
      savedReplyIds={new Set()}
      showActions={false}
      onReportReply={() => {}}
      onReportRequest={() => {}}
      onToggleSaveReply={() => {}}
    />
  );
}

export function RequestDetailContent() {
  const params = useParams<{ requestId: string }>();
  const searchParams = useSearchParams();
  const replyId = searchParams.get("replyId") ?? undefined;
  const query = useMyRequestThreadQuery(params.requestId);

  return (
    <main className="onseol-fade-in mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-10 sm:px-8">
      <Link
        className="text-sm text-muted hover:underline"
        href="/records?tab=requests"
      >
        ← 내 기록
      </Link>
      <RequestDetailBody query={query} replyId={replyId} />
    </main>
  );
}
