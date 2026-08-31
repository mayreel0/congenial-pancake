"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Skeleton } from "ui/Skeleton";
import { ServiceNav } from "../../../../components/navigation/ServiceNav";
import { ApiError } from "../../../../lib/api";
import { buildFeedItemLabels } from "../../../../lib/feed-item-labels";
import { usePublicRequestThreadQuery } from "../../../../lib/profile/queries";
import { parseProfileSlug } from "../../../../lib/profile/slug";
import { ReadThread } from "../../../../read/components/ReadThread";

type RequestDetailBodyProps = {
  query: ReturnType<typeof usePublicRequestThreadQuery>;
};

// Early return per branch instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function RequestDetailBody({ query }: RequestDetailBodyProps) {
  if (query.isPending) {
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
          ? "존재하지 않거나 비공개로 설정된 글입니다."
          : "글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."}
      </p>
    );
  }

  const item = query.data;
  if (!item) return null;

  // Public read-only view — no report/save actions here, unlike /read's
  // use of the same ReadThread.
  return (
    <ReadThread
      authorLabels={buildFeedItemLabels(item)}
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
  const params = useParams<{ slug: string; requestId: string }>();
  const parsed = parseProfileSlug(params.slug);

  const query = usePublicRequestThreadQuery(
    parsed?.nickname ?? null,
    parsed?.discriminator ?? null,
    params.requestId,
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/u" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-10 sm:px-8">
        {parsed ? (
          <>
            <Link
              className="text-sm text-muted hover:underline"
              href={`/u/${encodeURIComponent(`${parsed.nickname}-${parsed.discriminator}`)}/requests`}
            >
              ← 남긴 고민
            </Link>
            <RequestDetailBody query={query} />
          </>
        ) : (
          <p className="max-w-xl leading-7 text-muted">
            잘못된 프로필 주소입니다.
          </p>
        )}
      </main>
    </div>
  );
}
