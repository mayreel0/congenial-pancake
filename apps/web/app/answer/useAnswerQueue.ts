"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth/useAuth";
import type { RequestDto } from "../lib/requests/api";
import {
  useHeldRequestsQuery,
  useHoldMutation,
  useQueueQuery,
  useSkipMutation,
} from "../lib/requests/queries";
import { useCreateReplyMutation, useMyAnswerLogQuery } from "../lib/replies/queries";
import { useCreateReportMutation } from "../lib/reports/queries";

export type AnswerLogEntry = {
  request: { id: string; body: string; createdAt: string };
  reply: { id: string; requestId: string; body: string; createdAt: string };
};

type UseAnswerQueueResult = {
  currentAnswerTarget: RequestDto | null;
  heldRequests: RequestDto[];
  answerLog: AnswerLogEntry[];
  isAnsweringHeldRequest: boolean;
  // Hold/report require a login (see docs/decisions/2026-08-22-onseol-
  // answer-queue-decisions.md) — skip does not, so it's not gated here.
  canManageCurrentRequest: boolean;
  replyDrafts: Record<string, string>;
  updateReplyDraft(requestId: string, value: string): void;
  submitReply(requestId: string): Promise<void>;
  skipRequest(requestId: string): Promise<void>;
  holdRequest(requestId: string): Promise<void>;
  openHeldRequest(requestId: string): void;
  closeHeldRequest(): void;
  reportRequest(requestId: string): Promise<void>;
};

export function useAnswerQueue(): UseAnswerQueueResult {
  const { status } = useAuth();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeHeldRequestId, setActiveHeldRequestId] = useState<
    string | null
  >(null);

  const queueQuery = useQueueQuery();
  const heldQuery = useHeldRequestsQuery(status === "authenticated");
  const answerLogQuery = useMyAnswerLogQuery();
  const skipMutation = useSkipMutation();
  const holdMutation = useHoldMutation();
  const createReplyMutation = useCreateReplyMutation();
  const reportMutation = useCreateReportMutation();

  const heldRequests = heldQuery.data ?? [];
  const activeHeldRequest = activeHeldRequestId
    ? (heldRequests.find((request) => request.id === activeHeldRequestId) ??
      null)
    : null;
  const currentAnswerTarget = activeHeldRequest ?? queueQuery.data ?? null;

  const answerLog: AnswerLogEntry[] = (answerLogQuery.data ?? []).map(
    (entry) => ({
      request: {
        id: entry.requestId,
        body: entry.requestBody,
        createdAt: entry.requestCreatedAt,
      },
      reply: {
        id: entry.replyId,
        requestId: entry.requestId,
        body: entry.replyBody,
        createdAt: entry.replyCreatedAt,
      },
    }),
  );

  function updateReplyDraft(requestId: string, value: string): void {
    setReplyDrafts((current) => ({ ...current, [requestId]: value }));
  }

  async function submitReply(requestId: string): Promise<void> {
    const body = (replyDrafts[requestId] ?? "").trim();
    if (!body) return;

    await createReplyMutation.mutateAsync({ requestId, body });
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

  return {
    currentAnswerTarget,
    heldRequests,
    answerLog,
    isAnsweringHeldRequest: activeHeldRequest !== null,
    canManageCurrentRequest: status === "authenticated",
    replyDrafts,
    updateReplyDraft,
    submitReply,
    skipRequest,
    holdRequest,
    openHeldRequest,
    closeHeldRequest,
    reportRequest,
  };
}
