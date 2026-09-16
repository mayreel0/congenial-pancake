"use client";

import { useState } from "react";
import type { AdminContentStatus, AdminRequestListItemDto } from "shared/dto";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "shared/pagination";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { HeatmapCalendarField } from "ui/HeatmapCalendarField";
import { Pagination } from "ui/Pagination";
import { Select } from "ui/Select";
import { Skeleton } from "ui/Skeleton";
import { TextField } from "ui/TextField";
import { useDebouncedValue } from "ui/useDebouncedValue";
import { toast } from "ui/useToast";
import { formatTimestamp } from "utils";
import { AdminShell } from "./components/AdminShell";
import { AdminStatusGate } from "./components/AdminStatusGate";
import {
  addDaysToDateString,
  formatKoreanDate,
  monthAnchorOf,
  yesterdayKstDateString,
} from "./lib/kst-date";
import {
  useAdminDeleteRequestMutation,
  useAdminRequestsQuery,
  useAdminRestoreRequestMutation,
} from "./lib/admin/content-queries";
import { useAdminAccess } from "./lib/admin/useAdminAccess";

const STATUS_LABEL: Record<AdminContentStatus, string> = {
  visible: "정상",
  hidden: "숨김",
  deleted: "삭제됨",
};

const TH_CLASS =
  "border-b border-line px-3 py-2 text-left text-xs font-semibold text-muted";
const TD_CLASS = "border-b border-line px-3 py-3 align-top text-sm";

type RowActionsProps = {
  status: AdminContentStatus;
  onRestore(): void;
  onDelete(): void;
};

// 이미 정상인 글에 "복구"를, 이미 삭제된 글에 "영구 삭제"를 보여주는 건 의미 없는
// API 호출로만 이어지므로 상태별로 실제 쓸 수 있는 액션만 노출한다.
function RowActions({ status, onRestore, onDelete }: RowActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      {status !== "visible" && (
        <button
          className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border border-line px-3 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
          type="button"
          onClick={onRestore}
        >
          복구
        </button>
      )}
      {status !== "deleted" && (
        <button
          className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border border-line px-3 text-xs font-semibold text-red-600 transition hover:bg-surface-muted"
          type="button"
          onClick={onDelete}
        >
          영구 삭제
        </button>
      )}
    </div>
  );
}

type RequestsTableProps = {
  isLoading: boolean;
  items: AdminRequestListItemDto[];
  onRestore(id: string): void;
  onDelete(id: string): void;
};

function RequestsTable({
  isLoading,
  items,
  onRestore,
  onDelete,
}: RequestsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((key) => (
          <div
            className="space-y-2 rounded-lg border border-line bg-surface px-4 py-3"
            key={key}
          >
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted">
        조건에 맞는 고민이 없어요.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH_CLASS}>내용</th>
            <th className={`${TH_CLASS} whitespace-nowrap`}>작성일</th>
            <th className={`${TH_CLASS} whitespace-nowrap`}>상태</th>
            <th className={`${TH_CLASS} whitespace-nowrap`}>답변</th>
            <th className={`${TH_CLASS} whitespace-nowrap`}>신고</th>
            <th className={`${TH_CLASS} text-right`}>액션</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className={`${TD_CLASS} text-foreground`}>{item.body}</td>
              <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>
                {formatTimestamp(item.createdAt)}
              </td>
              <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>
                {STATUS_LABEL[item.status]}
              </td>
              <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>
                {item.replyCount}개
              </td>
              <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>
                {item.reportCount}건
              </td>
              <td className={TD_CLASS}>
                <RowActions
                  status={item.status}
                  onDelete={() => onDelete(item.id)}
                  onRestore={() => onRestore(item.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminRequests() {
  const access = useAdminAccess();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<AdminContentStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    monthAnchorOf(addDaysToDateString(yesterdayKstDateString(), 1)),
  );
  const debouncedQ = useDebouncedValue(q, 300);

  const requestsQuery = useAdminRequestsQuery(
    {
      q: debouncedQ || undefined,
      from: from || undefined,
      to: to || undefined,
      status: status || undefined,
      page,
      pageSize,
    },
    access.status === "ready",
  );
  const restoreMutation = useAdminRestoreRequestMutation();
  const deleteMutation = useAdminDeleteRequestMutation();
  const data = requestsQuery.data;

  async function handleRestore(id: string) {
    try {
      await restoreMutation.mutateAsync(id);
      toast.success("복구했어요.");
    } catch (error) {
      toast.error(error);
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("영구 삭제했어요.");
    } catch (error) {
      toast.error(error);
    }
  }

  return (
    <AdminShell activePath="/requests">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8">
        <h1 className="text-lg font-semibold text-foreground">고민 관리</h1>

        <div className="flex flex-wrap items-end gap-3">
          <TextField
            id="admin-requests-search"
            label="검색"
            placeholder="본문 검색어"
            value={q}
            width="search"
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
          />
          <HeatmapCalendarField
            counts={[]}
            formatDate={formatKoreanDate}
            label="시작일"
            maxDate={to || undefined}
            month={calendarMonth}
            placeholder="시작일을 선택하세요"
            selected={from || undefined}
            onMonthChange={setCalendarMonth}
            onSelect={(date) => {
              setFrom(date);
              setPage(1);
            }}
          />
          <HeatmapCalendarField
            counts={[]}
            formatDate={formatKoreanDate}
            label="종료일"
            minDate={from || undefined}
            month={calendarMonth}
            placeholder="종료일을 선택하세요"
            selected={to || undefined}
            onMonthChange={setCalendarMonth}
            onSelect={(date) => {
              setTo(date);
              setPage(1);
            }}
          />
          <Select
            id="admin-requests-status"
            label="상태"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as AdminContentStatus | "");
              setPage(1);
            }}
          >
            <option value="">전체</option>
            <option value="visible">정상</option>
            <option value="hidden">숨김</option>
            <option value="deleted">삭제됨</option>
          </Select>
        </div>

        <AdminStatusGate status={access.status}>
          <div className="flex flex-col gap-4">
            <RequestsTable
              isLoading={requestsQuery.isLoading}
              items={data?.items ?? []}
              onDelete={(id) => setPendingDeleteId(id)}
              onRestore={(id) => void handleRestore(id)}
            />
            {data && (
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                totalPages={data.totalPages}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            )}
          </div>
        </AdminStatusGate>
      </main>
      <ActionConfirmDialog
        confirmLabel="영구 삭제"
        message="영구 삭제할까요? 되돌릴 수 없어요."
        open={pendingDeleteId !== null}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </AdminShell>
  );
}
