"use client";

import { useRef, useState } from "react";
import {
  useCreateRequestMutation,
  useRequestsQuery,
} from "../lib/requests/queries";

type RequestSubmitStatus = "idle" | "pending" | "success";

export const FALLBACK_ONSEOL_MESSAGES = [
  "오늘 실수한 일이 계속 떠올라요.",
  "별일 아닌데 마음이 좀 가라앉았어요.",
  "끝내긴 했는데 잘한 건지 모르겠어요.",
  "그냥 오늘 하루 버틴 걸 알아줬으면 해요.",
];

const TODAY_ENTRY_MESSAGE_LIMIT = 5;

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
  const [requestDraft, setRequestDraft] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);
  const requestSubmittingRef = useRef(false);
  const requestsQuery = useRequestsQuery();
  const createRequestMutation = useCreateRequestMutation();

  const requests = requestsQuery.data ?? [];
  const todayEntryMessages =
    requests.length > 0
      ? requests.slice(0, TODAY_ENTRY_MESSAGE_LIMIT).map((request) => request.body)
      : FALLBACK_ONSEOL_MESSAGES;

  function updateRequestDraft(value: string): void {
    if (justSubmitted) setJustSubmitted(false);
    setRequestDraft(value);
  }

  async function submitRequest(bodyOverride?: string): Promise<void> {
    if (requestSubmittingRef.current) return;

    const body = (bodyOverride ?? requestDraft).trim();
    if (!body) return;

    requestSubmittingRef.current = true;
    try {
      await createRequestMutation.mutateAsync(body);
      setRequestDraft("");
      setJustSubmitted(true);
    } finally {
      requestSubmittingRef.current = false;
    }
  }

  const requestSubmitStatus: RequestSubmitStatus = createRequestMutation.isPending
    ? "pending"
    : justSubmitted
      ? "success"
      : "idle";

  return {
    requestDraft,
    requestSubmitStatus,
    todayEntryMessages,
    requestCount: requests.length,
    replyCount: requests.reduce((sum, request) => sum + request.replyCount, 0),
    updateRequestDraft,
    submitRequest,
  };
}
