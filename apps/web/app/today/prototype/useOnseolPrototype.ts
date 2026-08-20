"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getAnswerQueue,
  getHeldRequests,
  getMyAnswerLog,
  getMyReplies,
  getMyRequests,
  getPriorityRequests,
  getReadFeed,
  getRecentExchanges,
  getTodayEntryMessages,
  getVisibleRepliesForRequest,
  hasViewerReplied,
} from "./model";
import type { ReadFeedItem } from "./model";
import { createInitialPrototypeState } from "./seed-data";
import {
  readPrototypeState,
  resetPrototypeState,
  writePrototypeState,
} from "./storage";
import type { OnseolReply, OnseolRequest, PrototypeState } from "./types";

type RequestSubmitStatus = "idle" | "pending" | "success";

export const REQUEST_SUBMIT_PENDING_MS = 450;

const FALLBACK_ONSEOL_MESSAGES = [
  "오늘 실수한 일이 계속 떠올라요.",
  "별일 아닌데 마음이 좀 가라앉았어요.",
  "끝내긴 했는데 잘한 건지 모르겠어요.",
  "그냥 오늘 하루 버틴 걸 알아줬으면 해요.",
];

type UseOnseolPrototypeResult = {
  state: PrototypeState;
  requestSubmitStatus: RequestSubmitStatus;
  todayEntryMessages: string[];
  priorityRequests: OnseolRequest[];
  selectedRequest: OnseolRequest | null;
  selectedReplies: OnseolReply[];
  recentExchanges: Array<{ request: OnseolRequest; reply: OnseolReply | null }>;
  myRequests: OnseolRequest[];
  myReplies: OnseolReply[];
  answerQueue: OnseolRequest[];
  heldRequests: OnseolRequest[];
  answerLog: Array<{ request: OnseolRequest; reply: OnseolReply }>;
  currentAnswerTarget: OnseolRequest | null;
  isAnsweringHeldRequest: boolean;
  readFeed: ReadFeedItem[];
  updateRequestDraft(value: string): void;
  submitRequest(bodyOverride?: string): Promise<void>;
  selectRequest(requestId: string): void;
  updateReplyDraft(requestId: string, value: string): void;
  submitReply(requestId: string): void;
  skipRequest(requestId: string): void;
  holdRequest(requestId: string): void;
  openHeldRequest(requestId: string): void;
  closeHeldRequest(): void;
  reportRequest(requestId: string): void;
  reportReply(replyId: string): void;
  toggleSavedReply(replyId: string): void;
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
  const [requestSubmitStatus, setRequestSubmitStatus] =
    useState<RequestSubmitStatus>("idle");
  const requestSubmittingRef = useRef(false);
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
  const todayEntryMessages = getTodayEntryMessages(
    state,
    FALLBACK_ONSEOL_MESSAGES,
  );
  const myRequests = getMyRequests(state);
  const myReplies = getMyReplies(state);
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
  const readFeed = useMemo(() => getReadFeed(state), [state]);

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
    if (requestSubmitStatus === "success") {
      setRequestSubmitStatus("idle");
    }
    updateState((current) => ({ ...current, requestDraft: value }));
  }

  async function submitRequest(bodyOverride?: string): Promise<void> {
    if (requestSubmittingRef.current) return;

    const body = (bodyOverride ?? state.requestDraft).trim();
    if (!body) return;

    requestSubmittingRef.current = true;
    setRequestSubmitStatus("pending");

    await new Promise((resolve) =>
      window.setTimeout(resolve, REQUEST_SUBMIT_PENDING_MS),
    );

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
      selectedRequestId: current.selectedRequestId,
    }));
    requestSubmittingRef.current = false;
    setRequestSubmitStatus("success");
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

  function toggleSavedReply(replyId: string): void {
    updateState((current) => {
      const saved = current.savedReplyIds.includes(replyId);
      return {
        ...current,
        savedReplyIds: saved
          ? current.savedReplyIds.filter((id) => id !== replyId)
          : [...current.savedReplyIds, replyId],
      };
    });
  }

  function resetPrototype(): void {
    setState(resetPrototypeState());
  }

  return {
    state,
    requestSubmitStatus,
    todayEntryMessages,
    priorityRequests,
    selectedRequest,
    selectedReplies,
    recentExchanges,
    myRequests,
    myReplies,
    answerQueue,
    heldRequests,
    answerLog,
    currentAnswerTarget,
    isAnsweringHeldRequest: activeHeldRequest !== null,
    readFeed,
    updateRequestDraft,
    submitRequest,
    selectRequest,
    updateReplyDraft,
    submitReply,
    skipRequest,
    holdRequest,
    openHeldRequest,
    closeHeldRequest,
    reportRequest,
    reportReply,
    toggleSavedReply,
    resetPrototype,
    hasViewerRepliedToSelected: selectedRequest
      ? hasViewerReplied(state, selectedRequest.id)
      : false,
  };
}
