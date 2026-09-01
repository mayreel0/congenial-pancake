"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth/useAuth";
import {
  daysInMonthAnchor,
  isValidDateString,
  monthAnchorOf,
  yesterdayKstDateString,
} from "../lib/kst-date";
import { parsePageParam, parsePageSizeParam } from "../lib/pagination";
import { useUrlState } from "../lib/useUrlState";
import type { FeedItemDto } from "../lib/requests/api";
import { useFeedDayCountsQuery, useFeedQuery } from "../lib/requests/queries";
import {
  useSavedReplyIdsQuery,
  useSaveReplyMutation,
  useUnsaveReplyMutation,
} from "../lib/replies/queries";
import { useCreateReportMutation } from "../lib/reports/queries";

type UseReadFeedResult = {
  readFeed: FeedItemDto[];
  isLoading: boolean;
  // The KST date actually shown — starts undefined (backend defaults to
  // yesterday) and becomes concrete once the response comes back, so day
  // nav has a real date to shift from even before the first response.
  currentDate: string;
  maxSelectableDate: string;
  goToDate(date: string): void;
  // HeatmapCalendar's own month view — independent of currentDate so
  // browsing to a different month doesn't itself change which day is
  // selected.
  calendarMonth: string;
  setCalendarMonth(month: string): void;
  dayCounts: { date: string; count: number }[];
  page: number;
  totalPages: number;
  setPage(page: number): void;
  pageSize: number;
  setPageSize(pageSize: number): void;
  savedReplyIds: string[];
  // Save and report both require a login (see docs/decisions/2026-08-22-
  // onseol-answer-queue-decisions.md) — gated together here, matching
  // /answer's canManageCurrentRequest.
  canManage: boolean;
  reportRequest(requestId: string): Promise<void>;
  reportReply(replyId: string): Promise<void>;
  toggleSavedReply(replyId: string): Promise<void>;
};

type ReadUrlKey = "date" | "page" | "pageSize";

export function useReadFeed(): UseReadFeedResult {
  const { status } = useAuth();
  const canManage = status === "authenticated";
  const [urlState, updateUrlState] = useUrlState<ReadUrlKey>(
    "/read",
    ["date", "page", "pageSize"],
    { date: undefined, page: undefined, pageSize: undefined },
  );

  const date =
    urlState.date && isValidDateString(urlState.date)
      ? urlState.date
      : undefined;
  const page = parsePageParam(urlState.page);
  const pageSize = parsePageSizeParam(urlState.pageSize);

  const feedQuery = useFeedQuery(date, page, pageSize);
  const savedQuery = useSavedReplyIdsQuery(canManage);
  const saveMutation = useSaveReplyMutation();
  const unsaveMutation = useUnsaveReplyMutation();
  const reportMutation = useCreateReportMutation();

  const savedReplyIds = savedQuery.data ?? [];
  const currentDate = feedQuery.data?.date ?? date ?? yesterdayKstDateString();
  const maxSelectableDate = yesterdayKstDateString();

  const [calendarMonth, setCalendarMonth] = useState(() =>
    monthAnchorOf(currentDate),
  );
  const monthDays = daysInMonthAnchor(calendarMonth);
  const dayCountsQuery = useFeedDayCountsQuery(
    monthDays[0],
    monthDays[monthDays.length - 1],
  );

  function goToDate(nextDate: string): void {
    updateUrlState({ date: nextDate, page: undefined });
  }

  function setPage(nextPage: number): void {
    updateUrlState({ page: String(nextPage) });
  }

  function setPageSize(size: number): void {
    updateUrlState({ pageSize: String(size), page: undefined });
  }

  async function reportRequest(requestId: string): Promise<void> {
    await reportMutation.mutateAsync({
      targetType: "request",
      targetId: requestId,
    });
  }

  async function reportReply(replyId: string): Promise<void> {
    await reportMutation.mutateAsync({
      targetType: "reply",
      targetId: replyId,
    });
  }

  async function toggleSavedReply(replyId: string): Promise<void> {
    if (savedReplyIds.includes(replyId)) {
      await unsaveMutation.mutateAsync(replyId);
    } else {
      await saveMutation.mutateAsync(replyId);
    }
  }

  return {
    readFeed: feedQuery.data?.items ?? [],
    isLoading: feedQuery.isPending || feedQuery.isLoading,
    currentDate,
    maxSelectableDate,
    goToDate,
    calendarMonth,
    setCalendarMonth,
    dayCounts: dayCountsQuery.data?.days ?? [],
    page,
    totalPages: feedQuery.data?.totalPages ?? 1,
    setPage,
    pageSize,
    setPageSize,
    savedReplyIds,
    canManage,
    reportRequest,
    reportReply,
    toggleSavedReply,
  };
}
