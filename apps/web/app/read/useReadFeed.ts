"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth/useAuth";
import { addDaysToDateString, yesterdayKstDateString } from "../lib/kst-date";
import { DEFAULT_PAGE_SIZE } from "../lib/pagination";
import type { FeedItemDto } from "../lib/requests/api";
import { useFeedQuery } from "../lib/requests/queries";
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
  canGoToNextDay: boolean;
  goToPreviousDay(): void;
  goToNextDay(): void;
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

export function useReadFeed(): UseReadFeedResult {
  const { status } = useAuth();
  const canManage = status === "authenticated";
  const [date, setDate] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);

  const feedQuery = useFeedQuery(date, page, pageSize);
  const savedQuery = useSavedReplyIdsQuery(canManage);
  const saveMutation = useSaveReplyMutation();
  const unsaveMutation = useUnsaveReplyMutation();
  const reportMutation = useCreateReportMutation();

  const savedReplyIds = savedQuery.data ?? [];
  const currentDate = feedQuery.data?.date ?? date ?? yesterdayKstDateString();
  const canGoToNextDay = currentDate < yesterdayKstDateString();

  function goToPreviousDay(): void {
    setDate(addDaysToDateString(currentDate, -1));
    setPage(1);
  }

  function goToNextDay(): void {
    if (!canGoToNextDay) return;
    setDate(addDaysToDateString(currentDate, 1));
    setPage(1);
  }

  function setPageSize(size: number): void {
    setPageSizeState(size);
    setPage(1);
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
    canGoToNextDay,
    goToPreviousDay,
    goToNextDay,
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
