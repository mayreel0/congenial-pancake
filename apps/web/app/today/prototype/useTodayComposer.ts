"use client";

import { useRef, useState } from "react";
import { getTodayEntryMessages } from "./model";
import { usePrototypeStorage } from "./usePrototypeStorage";
import type { OnseolRequest } from "./types";

type RequestSubmitStatus = "idle" | "pending" | "success";

export const REQUEST_SUBMIT_PENDING_MS = 450;

const FALLBACK_ONSEOL_MESSAGES = [
  "오늘 실수한 일이 계속 떠올라요.",
  "별일 아닌데 마음이 좀 가라앉았어요.",
  "끝내긴 했는데 잘한 건지 모르겠어요.",
  "그냥 오늘 하루 버틴 걸 알아줬으면 해요.",
];

function createRequestId(): string {
  return `proto-request-${Date.now()}`;
}

type UseTodayComposerResult = {
  requestDraft: string;
  requestSubmitStatus: RequestSubmitStatus;
  todayEntryMessages: string[];
  requestCount: number;
  replyCount: number;
  updateRequestDraft(value: string): void;
  submitRequest(bodyOverride?: string): Promise<void>;
};

export function useTodayComposer(): UseTodayComposerResult {
  const { state, updateState } = usePrototypeStorage();
  const [requestSubmitStatus, setRequestSubmitStatus] =
    useState<RequestSubmitStatus>("idle");
  const requestSubmittingRef = useRef(false);

  const todayEntryMessages = getTodayEntryMessages(
    state,
    FALLBACK_ONSEOL_MESSAGES,
  );

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

  return {
    requestDraft: state.requestDraft,
    requestSubmitStatus,
    todayEntryMessages,
    requestCount: state.requests.filter((request) => !request.hidden).length,
    replyCount: state.replies.filter((reply) => !reply.hidden).length,
    updateRequestDraft,
    submitRequest,
  };
}
