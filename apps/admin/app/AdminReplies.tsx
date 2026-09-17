"use client";

import { useState } from "react";
import type {
  AdminContentStatus,
  AdminReplyListItemDto,
  ReplyModerationActionDto,
} from "shared/dto";
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
  useAdminDeleteReplyMutation,
  useAdminRepliesQuery,
  useAdminRestoreReplyMutation,
} from "./lib/admin/content-queries";
import { useAdminAccess } from "./lib/admin/useAdminAccess";

const STATUS_LABEL: Record<AdminContentStatus, string> = {
  visible: "정상",
  hidden: "숨김",
  deleted: "삭제됨",
};

const ACTION_LABEL: Record<ReplyModerationActionDto, string> = {
  allow: "정상",
  suggest_rewrite: "순화 제안",
  block: "차단 권장",
  uncertain: "애매함",
};

const ACTION_BADGE_CLASS: Record<ReplyModerationActionDto, string> = {
  allow: "bg-green-100 text-green-700",
  suggest_rewrite: "bg-amber-100 text-amber-700",
  block: "bg-red-100 text-red-700",
  uncertain: "bg-surface-muted text-muted",
};

const TH_CLASS =
  "border-b border-line px-3 py-2 text-left text-xs font-semibold text-muted";
const TD_CLASS = "border-b border-line px-3 py-3 align-top text-sm";

type RowActionsProps = {
  status: AdminContentStatus;
  onRestore(): void;
  onDelete(): void;
};

// 이미 정상인 답변에 "복구"를, 이미 삭제된 답변에 "영구 삭제"를 보여주는 건 의미 없는
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

type ModerationCellProps = {
  moderation: AdminReplyListItemDto["moderation"];
};

// AI 사전검토(dry-run) 판정 — 지금은 실제로 답변을 막지 않고 기록만 하는 단계라,
// admin이 이 배지/사유를 보고 "실시간 차단으로 연결해도 될지" 판단할 근거 자료로
// 쓰는 게 목적이다.
function ModerationCell({ moderation }: ModerationCellProps) {
  if (!moderation) {
    return <span className="text-xs text-muted">미검토</span>;
  }
  return (
    <div className="space-y-1">
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_BADGE_CLASS[moderation.action]}`}
      >
        {ACTION_LABEL[moderation.action]}
      </span>
      {moderation.action !== "allow" && (
        <p className="max-w-xs text-xs text-muted">{moderation.reason}</p>
      )}
      {moderation.suggestions.length > 0 && (
        <p className="max-w-xs text-xs text-muted">
          대체 제안: {moderation.suggestions.join(" / ")}
        </p>
      )}
    </div>
  );
}

type RepliesTableProps = {
  isLoading: boolean;
  items: AdminReplyListItemDto[];
  onRestore(id: string): void;
  onDelete(id: string): void;
};

function RepliesTable({
  isLoading,
  items,
  onRestore,
  onDelete,
}: RepliesTableProps) {
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
        조건에 맞는 답변이 없어요.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH_CLASS}>원글</th>
            <th className={TH_CLASS}>답변 내용</th>
            <th className={`${TH_CLASS} whitespace-nowrap`}>작성일</th>
            <th className={`${TH_CLASS} whitespace-nowrap`}>상태</th>
            <th className={TH_CLASS}>AI 검토</th>
            <th className={`${TH_CLASS} whitespace-nowrap`}>신고</th>
            <th className={`${TH_CLASS} text-right`}>액션</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className={`${TD_CLASS} text-muted`}>{item.requestBody}</td>
              <td className={`${TD_CLASS} text-foreground`}>{item.body}</td>
              <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>
                {formatTimestamp(item.createdAt)}
              </td>
              <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>
                {STATUS_LABEL[item.status]}
              </td>
              <td className={TD_CLASS}>
                <ModerationCell moderation={item.moderation} />
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

export function AdminReplies() {
  const access = useAdminAccess();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<AdminContentStatus | "">("");
  const [action, setAction] = useState<ReplyModerationActionDto | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    monthAnchorOf(addDaysToDateString(yesterdayKstDateString(), 1)),
  );
  const debouncedQ = useDebouncedValue(q, 300);

  const repliesQuery = useAdminRepliesQuery(
    {
      q: debouncedQ || undefined,
      from: from || undefined,
      to: to || undefined,
      status: status || undefined,
      action: action || undefined,
      page,
      pageSize,
    },
    access.status === "ready",
  );
  const restoreMutation = useAdminRestoreReplyMutation();
  const deleteMutation = useAdminDeleteReplyMutation();
  const data = repliesQuery.data;

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
    <AdminShell activePath="/replies">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8">
        <h1 className="text-lg font-semibold text-foreground">답변 관리</h1>

        {/* A dedicated @container wrapper, separate from the row it
            contains — an element can't container-query its own size, so
            the row's @min-[960px]:flex-row below needs an ancestor
            (this div) with container-type set, not itself. Matters here
            specifically because AdminShell's desktop sidebar toggle
            changes this row's real width without the viewport changing
            at all. See ui/filterRowBreakpoint.ts. */}
        <div className="@container">
          <div className="flex flex-col gap-3 @min-[960px]:flex-row @min-[960px]:flex-wrap @min-[960px]:items-end">
            <TextField
              breakpoint="960"
              id="admin-replies-search"
              label="검색"
              placeholder="답변 검색어"
              value={q}
              width="search"
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
            />
            <HeatmapCalendarField
              breakpoint="960"
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
              breakpoint="960"
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
              breakpoint="960"
              id="admin-replies-status"
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
            <Select
              breakpoint="960"
              id="admin-replies-action"
              label="AI 검토"
              value={action}
              onChange={(event) => {
                setAction(event.target.value as ReplyModerationActionDto | "");
                setPage(1);
              }}
            >
              <option value="">전체</option>
              <option value="allow">정상</option>
              <option value="suggest_rewrite">순화 제안</option>
              <option value="block">차단 권장</option>
              <option value="uncertain">애매함</option>
            </Select>
          </div>
        </div>

        <AdminStatusGate status={access.status}>
          <div className="flex flex-col gap-4">
            <RepliesTable
              isLoading={repliesQuery.isLoading}
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
