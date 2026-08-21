"use client";

import { useMemo, useState } from "react";
import {
  getAnswerQueue,
  getHeldRequests,
  getMyAnswerLog,
  getPriorityRequests,
  hasViewerReplied,
} from "./model";
import { usePrototypeStorage } from "./usePrototypeStorage";
import type { OnseolReply, OnseolRequest } from "./types";

function createReplyId(): string {
  return `proto-reply-${Date.now()}`;
}

type UseAnswerQueueResult = {
  answerQueue: OnseolRequest[];
  heldRequests: OnseolRequest[];
  answerLog: Array<{ request: OnseolRequest; reply: OnseolReply }>;
  currentAnswerTarget: OnseolRequest | null;
  isAnsweringHeldRequest: boolean;
  replyDrafts: Record<string, string>;
  updateReplyDraft(requestId: string, value: string): void;
  submitReply(requestId: string): void;
  skipRequest(requestId: string): void;
  holdRequest(requestId: string): void;
  openHeldRequest(requestId: string): void;
  closeHeldRequest(): void;
  reportRequest(requestId: string): void;
};

export function useAnswerQueue(): UseAnswerQueueResult {
  const { state, updateState } = usePrototypeStorage();
  const now = useMemo(() => new Date(), []);
  const [activeHeldRequestId, setActiveHeldRequestId] = useState<
    string | null
  >(null);

  const answerQueue = useMemo(() => getAnswerQueue(state, now), [now, state]);
  const heldRequests = useMemo(() => getHeldRequests(state), [state]);
  const answerLog = useMemo(() => getMyAnswerLog(state), [state]);
  const activeHeldRequest = activeHeldRequestId
    ? (state.requests.find(
        (request) =>
          request.id === activeHeldRequestId &&
          !request.hidden &&
          state.heldRequestIds.includes(request.id),
      ) ?? null)
    : null;
  const currentAnswerTarget = activeHeldRequest ?? answerQueue[0] ?? null;

  function updateReplyDraft(requestId: string, value: string): void {
    updateState((current) => ({
      ...current,
      replyDrafts: {
        ...current.replyDrafts,
        [requestId]: value,
      },
    }));
  }

  function submitReply(requestId: string): void {
    updateState((current) => {
      const body = (current.replyDrafts[requestId] ?? "").trim();
      if (!body || hasViewerReplied(current, requestId)) return current;

      const reply: OnseolReply = {
        id: createReplyId(),
        requestId,
        body,
        createdAt: new Date().toISOString(),
        authorId: current.viewer.id,
        reportCount: 0,
        hidden: false,
      };

      return {
        ...current,
        replies: [reply, ...current.replies],
        requests: current.requests.map((request) =>
          request.id === requestId
            ? { ...request, replyIds: [...request.replyIds, reply.id] }
            : request,
        ),
        replyDrafts: {
          ...current.replyDrafts,
          [requestId]: "",
        },
        heldRequestIds: current.heldRequestIds.filter(
          (id) => id !== requestId,
        ),
      };
    });

    if (activeHeldRequestId === requestId) setActiveHeldRequestId(null);
  }

  function skipRequest(requestId: string): void {
    updateState((current) => {
      if (current.skippedRequestIds.includes(requestId)) return current;

      return {
        ...current,
        skippedRequestIds: [...current.skippedRequestIds, requestId],
        heldRequestIds: current.heldRequestIds.filter(
          (id) => id !== requestId,
        ),
      };
    });

    if (activeHeldRequestId === requestId) setActiveHeldRequestId(null);
  }

  function holdRequest(requestId: string): void {
    updateState((current) => {
      if (current.heldRequestIds.includes(requestId)) return current;

      return {
        ...current,
        heldRequestIds: [...current.heldRequestIds, requestId],
      };
    });
  }

  function openHeldRequest(requestId: string): void {
    if (!state.heldRequestIds.includes(requestId)) return;
    setActiveHeldRequestId(requestId);
  }

  function closeHeldRequest(): void {
    setActiveHeldRequestId(null);
  }

  function reportRequest(requestId: string): void {
    updateState((current) => {
      const requests = current.requests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              reportCount: request.reportCount + 1,
              hidden: true,
            }
          : request,
      );
      const next = { ...current, requests };
      const nextSelected =
        requestId === current.selectedRequestId
          ? getPriorityRequests(next, new Date())[0]?.id ?? null
          : current.selectedRequestId;

      return { ...next, selectedRequestId: nextSelected };
    });
  }

  return {
    answerQueue,
    heldRequests,
    answerLog,
    currentAnswerTarget,
    isAnsweringHeldRequest: activeHeldRequest !== null,
    replyDrafts: state.replyDrafts,
    updateReplyDraft,
    submitReply,
    skipRequest,
    holdRequest,
    openHeldRequest,
    closeHeldRequest,
    reportRequest,
  };
}
