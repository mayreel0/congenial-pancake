"use client";

import { useCallback, useState } from "react";
import {
  SKELETON_MIN_DISPLAY_MS,
  useMinDisplayDuration,
} from "ui/useMinDisplayDuration";
import { useAuth } from "../lib/auth/useAuth";
import type { AuthorDisplayDto, RequestDto } from "../lib/requests/api";
import {
  useHeldRequestsQuery,
  useHoldMutation,
  useQueueQuery,
  useSkipMutation,
} from "../lib/requests/queries";
import {
  useCreateReplyMutation,
  useMyAnswerLogInfiniteQuery,
} from "../lib/replies/queries";
import { useCreateReportMutation } from "../lib/reports/queries";

export type AnswerLogEntry = {
  request: {
    id: string;
    body: string;
    createdAt: string;
    author: AuthorDisplayDto;
  };
  reply: {
    id: string;
    requestId: string;
    body: string;
    createdAt: string;
    author: AuthorDisplayDto;
  };
};

type UseAnswerQueueResult = {
  currentAnswerTarget: RequestDto | null;
  // True only for the very first fetch of the live queue candidate (not
  // while viewing a held request, and not during skip/submit/hold's own
  // "다음 글 불러오는 중" transition, which AnswerSession tracks separately) —
  // lets AnswerLog tell "아직 안 불러왔다" apart from "정말 없다".
  isLoadingCurrentTarget: boolean;
  heldRequests: RequestDto[];
  isLoadingHeldRequests: boolean;
  answerLog: AnswerLogEntry[];
  isLoadingAnswerLog: boolean;
  isAnsweringHeldRequest: boolean;
  hasOlderAnswerLogEntries: boolean;
  isLoadingOlderAnswerLogEntries: boolean;
  loadOlderAnswerLogEntries(): void;
  // Hold/report require a login (see docs/decisions/2026-08-22-onseol-
  // answer-queue-decisions.md) — skip does not, so it's not gated here.
  canManageCurrentRequest: boolean;
  replyDrafts: Record<string, string>;
  // Same reveal-toggle rule as useTodayComposer — null nickname means the
  // composer hides the toggle entirely.
  nickname: string | null;
  isLoadingNickname: boolean;
  anonymous: boolean;
  toggleAnonymous(): void;
  updateReplyDraft(requestId: string, value: string): void;
  submitReply(requestId: string): Promise<void>;
  skipRequest(requestId: string): Promise<void>;
  holdRequest(requestId: string): Promise<void>;
  openHeldRequest(requestId: string): void;
  closeHeldRequest(): void;
  reportRequest(requestId: string): Promise<void>;
};

export function useAnswerQueue(): UseAnswerQueueResult {
  const { status, user } = useAuth();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [anonymous, setAnonymous] = useState(true);
  const [activeHeldRequestId, setActiveHeldRequestId] = useState<
    string | null
  >(null);

  const queueQuery = useQueueQuery();
  const heldQuery = useHeldRequestsQuery(status === "authenticated");
  const answerLogQuery = useMyAnswerLogInfiniteQuery();
  const skipMutation = useSkipMutation();
  const holdMutation = useHoldMutation();
  const createReplyMutation = useCreateReplyMutation();
  const reportMutation = useCreateReportMutation();
  const { fetchNextPage } = answerLogQuery;
  const loadOlderAnswerLogEntries = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const heldRequests = heldQuery.data ?? [];
  const activeHeldRequest = activeHeldRequestId
    ? (heldRequests.find((request) => request.id === activeHeldRequestId) ??
      null)
    : null;
  const currentAnswerTarget = activeHeldRequest ?? queueQuery.data ?? null;

  // Each page is newest-first; pages are fetched newest-page-first too, so
  // flattening in fetch order gives one continuous newest→oldest sequence —
  // reversed here since AnswerLog renders oldest-first (a chat log growing
  // downward toward the live "지금 답할 차례" section).
  const answerLog: AnswerLogEntry[] = (answerLogQuery.data?.pages ?? [])
    .flatMap((page) => page.items)
    .reverse()
    .map((entry) => ({
      request: {
        id: entry.requestId,
        body: entry.requestBody,
        createdAt: entry.requestCreatedAt,
        author: entry.requestAuthor,
      },
      reply: {
        id: entry.replyId,
        requestId: entry.requestId,
        body: entry.replyBody,
        createdAt: entry.replyCreatedAt,
        author: entry.replyAuthor,
      },
    }));

  function updateReplyDraft(requestId: string, value: string): void {
    setReplyDrafts((current) => ({ ...current, [requestId]: value }));
  }

  function toggleAnonymous(): void {
    setAnonymous((current) => !current);
  }

  async function submitReply(requestId: string): Promise<void> {
    const body = (replyDrafts[requestId] ?? "").trim();
    if (!body) return;

    await createReplyMutation.mutateAsync({
      requestId,
      body,
      anonymous: user?.nickname ? anonymous : true,
    });
    setReplyDrafts((current) => ({ ...current, [requestId]: "" }));
    if (activeHeldRequestId === requestId) setActiveHeldRequestId(null);
  }

  async function skipRequest(requestId: string): Promise<void> {
    await skipMutation.mutateAsync(requestId);
    if (activeHeldRequestId === requestId) setActiveHeldRequestId(null);
  }

  async function holdRequest(requestId: string): Promise<void> {
    await holdMutation.mutateAsync(requestId);
  }

  function openHeldRequest(requestId: string): void {
    if (!heldRequests.some((request) => request.id === requestId)) return;
    setActiveHeldRequestId(requestId);
  }

  function closeHeldRequest(): void {
    setActiveHeldRequestId(null);
  }

  async function reportRequest(requestId: string): Promise<void> {
    await reportMutation.mutateAsync({ targetType: "request", targetId: requestId });
  }

  const isLoadingCurrentTarget = useMinDisplayDuration(
    !activeHeldRequest && queueQuery.isLoading,
    SKELETON_MIN_DISPLAY_MS,
  );
  const isLoadingHeldRequests = useMinDisplayDuration(
    heldQuery.isLoading,
    SKELETON_MIN_DISPLAY_MS,
  );
  const isLoadingAnswerLog = useMinDisplayDuration(
    answerLogQuery.isLoading,
    SKELETON_MIN_DISPLAY_MS,
  );
  const isLoadingNickname = useMinDisplayDuration(
    status === "loading",
    SKELETON_MIN_DISPLAY_MS,
  );

  return {
    currentAnswerTarget,
    isLoadingCurrentTarget,
    heldRequests,
    isLoadingHeldRequests,
    answerLog,
    isLoadingAnswerLog,
    isAnsweringHeldRequest: activeHeldRequest !== null,
    hasOlderAnswerLogEntries: answerLogQuery.hasNextPage,
    isLoadingOlderAnswerLogEntries: answerLogQuery.isFetchingNextPage,
    loadOlderAnswerLogEntries,
    canManageCurrentRequest: status === "authenticated",
    replyDrafts,
    nickname: user?.nickname ?? null,
    isLoadingNickname,
    anonymous,
    toggleAnonymous,
    updateReplyDraft,
    submitReply,
    skipRequest,
    holdRequest,
    openHeldRequest,
    closeHeldRequest,
    reportRequest,
  };
}
