"use client";

import { useEffect, useState } from "react";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { Button } from "ui/Button";
import { Pagination } from "ui/Pagination";
import { Skeleton } from "ui/Skeleton";
import {
  SKELETON_MIN_DISPLAY_MS,
  useMinDisplayDuration,
} from "ui/useMinDisplayDuration";
import { toast } from "ui/useToast";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { AuthCheckingSpinner } from "../components/shared/AuthCheckingSpinner";
import { loginHrefWithReturnTo } from "../lib/auth/loginHref";
import { useAuth } from "../lib/auth/useAuth";
import {
  useDeleteAllNotificationsMutation,
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useNotificationsQuery,
} from "../lib/notifications/queries";
import { PAGE_SIZE_OPTIONS } from "../lib/pagination";
import { NotificationListItem } from "./NotificationListItem";

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
  onDelete(id: string): void;
};

function NotificationsList({ query, onDelete }: NotificationsListProps) {
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
        <NotificationListItem
          body={notification.requestBody}
          createdAt={notification.createdAt}
          eyebrow="답장이 도착했어요"
          href={`/records/requests/${notification.requestId}?replyId=${notification.replyId}`}
          id={notification.id}
          key={notification.id}
          onDelete={onDelete}
        />
      ))}
    </ol>
  );
}

function NotificationsPageBody() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const query = useNotificationsQuery(page, pageSize, true);
  const markAllRead = useMarkAllNotificationsReadMutation();
  const deleteOne = useDeleteNotificationMutation();
  const deleteAll = useDeleteAllNotificationsMutation();

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

  // 알림 개별 삭제는 확인창 없이 즉시 처리 — 되돌릴 수 없는 다른 삭제(내가
  // 남긴 고민/답변)와 달리, 알림은 본인만 보는 가벼운 목록이라 매번 확인을
  // 거치는 게 오히려 번거롭다는 판단. "모두 지우기"만 한 번에 전부 사라지는
  // 무게감이 있어 ActionConfirmDialog로 확인한다.
  async function handleDeleteOne(id: string) {
    try {
      await deleteOne.mutateAsync(id);
    } catch (error) {
      toast.error(error);
    }
  }

  async function confirmClearAll() {
    setClearAllOpen(false);
    try {
      await deleteAll.mutateAsync();
      toast.success("모든 알림을 지웠어요.");
    } catch (error) {
      toast.error(error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <PageTitle />
        {query.data && query.data.totalItems > 0 && (
          <button
            className="whitespace-nowrap text-sm text-muted transition hover:text-foreground"
            type="button"
            onClick={() => setClearAllOpen(true)}
          >
            모두 지우기
          </button>
        )}
      </div>
      <NotificationsList query={query} onDelete={(id) => void handleDeleteOne(id)} />
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
      <ActionConfirmDialog
        confirmLabel="모두 지우기"
        message="모든 알림을 지울까요? 지운 알림은 되돌릴 수 없어요."
        open={clearAllOpen}
        onCancel={() => setClearAllOpen(false)}
        onConfirm={() => void confirmClearAll()}
      />
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
