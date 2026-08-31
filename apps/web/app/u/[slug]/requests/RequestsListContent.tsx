"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Pagination } from "ui/Pagination";
import { Skeleton } from "ui/Skeleton";
import { ServiceNav } from "../../../components/navigation/ServiceNav";
import { ApiError } from "../../../lib/api";
import {
  PAGE_SIZE_OPTIONS,
  parsePageParam,
  parsePageSizeParam,
} from "../../../lib/pagination";
import type { PaginatedDto } from "../../../lib/pagination";
import type { PublicRequestItemDto } from "../../../lib/profile/api";
import { usePublicRequestsQuery } from "../../../lib/profile/queries";
import { parseProfileSlug } from "../../../lib/profile/slug";
import { useUrlState } from "../../../lib/useUrlState";
import { ProfileListItemLink } from "../components/ProfileListItemLink";

type RequestsListUrlKey = "page" | "pageSize";

type RequestsListItemsProps = {
  profileHref: string;
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data: PaginatedDto<PublicRequestItemDto> | undefined;
  };
};

// Early return per branch instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern. Pagination is a
// sibling of this, not nested inside it — it stays visible even on an
// empty page (see ui/Pagination's "always renders" note).
function RequestsListItems({ profileHref, query }: RequestsListItemsProps) {
  if (query.isPending) {
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

  if (query.isError) {
    const notFound =
      query.error instanceof ApiError && query.error.statusCode === 404;
    return (
      <p className="max-w-xl leading-7 text-muted">
        {notFound
          ? "존재하지 않거나 비공개로 설정된 목록입니다."
          : "목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."}
      </p>
    );
  }

  if (!query.data || query.data.items.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-5 text-sm text-muted shadow-sm">
        공개한 고민이 없습니다.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {query.data.items.map((request) => (
        <ProfileListItemLink
          body={request.body}
          createdAt={request.createdAt}
          eyebrow="고민"
          href={`${profileHref}/requests/${request.id}`}
          key={request.id}
        />
      ))}
    </ol>
  );
}

export function RequestsListContent() {
  const params = useParams<{ slug: string }>();
  const parsed = parseProfileSlug(params.slug);

  const pathname = `/u/${params.slug}/requests`;
  const [urlState, updateUrlState] = useUrlState<RequestsListUrlKey>(
    pathname,
    ["page", "pageSize"],
    { page: undefined, pageSize: undefined },
  );
  const page = parsePageParam(urlState.page);
  const pageSize = parsePageSizeParam(urlState.pageSize);

  const query = usePublicRequestsQuery(
    parsed?.nickname ?? null,
    parsed?.discriminator ?? null,
    page,
    pageSize,
  );

  function setPage(nextPage: number) {
    updateUrlState({ page: String(nextPage) });
  }
  function setPageSize(size: number) {
    updateUrlState({ pageSize: String(size), page: undefined });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/u" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-10 sm:px-8">
        {parsed ? (
          <>
            <div className="space-y-3">
              <Link
                className="text-sm text-muted hover:underline"
                href={`/u/${encodeURIComponent(`${parsed.nickname}-${parsed.discriminator}`)}`}
              >
                ← {parsed.nickname}#{parsed.discriminator}
              </Link>
              <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
                남긴 고민
              </h1>
            </div>
            <RequestsListItems
              profileHref={`/u/${encodeURIComponent(`${parsed.nickname}-${parsed.discriminator}`)}`}
              query={query}
            />
            {query.data ? (
              <Pagination
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                totalPages={query.data.totalPages}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            ) : null}
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
