"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getMyReplies,
  getMyRequests,
  getPriorityRequests,
  getRecentExchanges,
  getVisibleRepliesForRequest,
  hasViewerReplied,
} from "./model";
import { createInitialPrototypeState } from "./seed-data";
import {
  readPrototypeState,
  resetPrototypeState,
  writePrototypeState,
} from "./storage";
import type { OnseolReply, OnseolRequest, PrototypeState } from "./types";

type UseOnseolPrototypeResult = {
  state: PrototypeState;
  priorityRequests: OnseolRequest[];
  selectedRequest: OnseolRequest | null;
  selectedReplies: OnseolReply[];
  recentExchanges: Array<{ request: OnseolRequest; reply: OnseolReply | null }>;
  myRequests: OnseolRequest[];
  myReplies: OnseolReply[];
  updateRequestDraft(value: string): void;
  submitRequest(): void;
  selectRequest(requestId: string): void;
  updateReplyDraft(requestId: string, value: string): void;
  submitReply(requestId: string): void;
  reportRequest(requestId: string): void;
  reportReply(replyId: string): void;
  resetPrototype(): void;
  hasViewerRepliedToSelected: boolean;
};

function createRequestId(): string {
  return `proto-request-${Date.now()}`;
}

function createReplyId(): string {
  return `proto-reply-${Date.now()}`;
}

export function useOnseolPrototype(): UseOnseolPrototypeResult {
  const [state, setState] = useState<PrototypeState>(() =>
    createInitialPrototypeState(new Date()),
  );
  const [hydrated, setHydrated] = useState(false);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setState(readPrototypeState());
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writePrototypeState(state);
    }
  }, [hydrated, state]);

  const priorityRequests = useMemo(
    () => getPriorityRequests(state, now),
    [now, state],
  );
  const selectedRequest =
    state.requests.find(
      (request) => request.id === state.selectedRequestId && !request.hidden,
    ) ?? priorityRequests[0] ?? null;
  const selectedReplies = selectedRequest
    ? getVisibleRepliesForRequest(state, selectedRequest.id)
    : [];
  const recentExchanges = getRecentExchanges(state);
  const myRequests = getMyRequests(state);
  const myReplies = getMyReplies(state);

  function updateState(
    updater: (current: PrototypeState) => PrototypeState,
  ): void {
    setState((current) => {
      const next = updater(current);
      writePrototypeState(next);
      return next;
    });
  }

  function updateRequestDraft(value: string): void {
    updateState((current) => ({ ...current, requestDraft: value }));
  }

  function submitRequest(): void {
    const body = state.requestDraft.trim();
    if (!body) return;

    const request: OnseolRequest = {
      id: createRequestId(),
      body,
      createdAt: new Date().toISOString(),
      authorId: state.viewer.id,
      replyIds: [],
      reportCount: 0,
      hidden: false,
    };

    updateState((current) => ({
      ...current,
      requests: [request, ...current.requests],
      requestDraft: "",
      selectedRequestId: request.id,
    }));
  }

  function selectRequest(requestId: string): void {
    updateState((current) => ({ ...current, selectedRequestId: requestId }));
  }

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
      };
    });
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

  function reportReply(replyId: string): void {
    updateState((current) => ({
      ...current,
      replies: current.replies.map((reply) =>
        reply.id === replyId
          ? { ...reply, reportCount: reply.reportCount + 1, hidden: true }
          : reply,
      ),
    }));
  }

  function resetPrototype(): void {
    setState(resetPrototypeState());
  }

  return {
    state,
    priorityRequests,
    selectedRequest,
    selectedReplies,
    recentExchanges,
    myRequests,
    myReplies,
    updateRequestDraft,
    submitRequest,
    selectRequest,
    updateReplyDraft,
    submitReply,
    reportRequest,
    reportReply,
    resetPrototype,
    hasViewerRepliedToSelected: selectedRequest
      ? hasViewerReplied(state, selectedRequest.id)
      : false,
  };
}
