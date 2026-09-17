"use client";

import { useEffect, useState } from "react";
import { Button } from "ui/Button";
import { Pagination } from "ui/Pagination";
import { Skeleton } from "ui/Skeleton";
import {
  SKELETON_MIN_DISPLAY_MS,
  useMinDisplayDuration,
} from "ui/useMinDisplayDuration";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { AuthCheckingSpinner } from "../components/shared/AuthCheckingSpinner";
import { ProfileListItemLink } from "../components/shared/ProfileListItemLink";
import { loginHrefWithReturnTo } from "../lib/auth/loginHref";
import { useAuth } from "../lib/auth/useAuth";
import {
  useMarkAllNotificationsReadMutation,
  useNotificationsQuery,
} from "../lib/notifications/queries";
import { PAGE_SIZE_OPTIONS } from "../lib/pagination";

function PageTitle() {
  return (
    <>
      <p className="text-sm text-muted">온설</p>
      <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
        알림
      </h1>
    </>
  );
}

type NotificationsListProps = {
  query: ReturnType<typeof useNotificationsQuery>;
};

function NotificationsList({ query }: NotificationsListProps) {
  const showSkeleton = useMinDisplayDuration(
    query.isPending,
    SKELETON_MIN_DISPLAY_MS,
  );

  if (showSkeleton) {
    return (
      <div className="space-y-3">
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
    return (
      <p className="max-w-xl leading-7 text-muted">
        알림을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </p>
    );
  }

  if (!query.data || query.data.items.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-5 text-sm text-muted shadow-sm">
        새 알림이 없어요.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {query.data.items.map((notification) => (
        <ProfileListItemLink
          body={notification.requestBody}
          createdAt={notification.createdAt}
          eyebrow="답장이 도착했어요"
          href={`/records/requests/${notification.requestId}?replyId=${notification.replyId}`}
          key={notification.id}
        />
      ))}
    </ol>
  );
}

function NotificationsPageBody() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const query = useNotificationsQuery(page, pageSize, true);
  const markAllRead = useMarkAllNotificationsReadMutation();

  // 이 페이지에 들어온 것 자체가 "확인했다"는 신호 — 다른 목적(로그아웃
  // 등)으로 프로필 메뉴만 열었을 때는 읽음 처리되지 않는다.
  useEffect(() => {
    markAllRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle />
      <NotificationsList query={query} />
      {query.data && (
        <Pagination
          page={page}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          totalPages={query.data.totalPages}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}

export function NotificationsPageContent() {
  const { status } = useAuth();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/notifications" />
      <main className="onseol-fade-in mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
        {status === "loading" && <AuthCheckingSpinner />}
        {status === "anonymous" && (
          <section className="space-y-3">
            <PageTitle />
            <p className="max-w-xl leading-7 text-muted">
              로그인하면 알림을 볼 수 있습니다.
            </p>
            <Button href={loginHrefWithReturnTo("/notifications")}>로그인</Button>
          </section>
        )}
        {status === "authenticated" && <NotificationsPageBody />}
      </main>
    </div>
  );
}
