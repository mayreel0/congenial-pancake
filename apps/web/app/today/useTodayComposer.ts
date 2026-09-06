"use client";

import { useRef, useState } from "react";
import { useAuth } from "../lib/auth/useAuth";
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

function toRequestSubmitStatus(
  isPending: boolean,
  justSubmitted: boolean,
): RequestSubmitStatus {
  if (isPending) return "pending";
  if (justSubmitted) return "success";
  return "idle";
}

type UseTodayComposerResult = {
  requestDraft: string;
  requestSubmitStatus: RequestSubmitStatus;
  todayEntryMessages: string[];
  requestCount: number;
  replyCount: number;
  // null when not logged in or the user hasn't set one yet — the composer
  // hides the reveal toggle entirely in that case (see docs/decisions/
  // 2026-08-28-onseol-nickname-post-reveal-decisions.md: a guest or a
  // nicknameless member can never post non-anonymously).
  nickname: string | null;
  anonymous: boolean;
  updateRequestDraft(value: string): void;
  toggleAnonymous(): void;
  submitRequest(bodyOverride?: string): Promise<void>;
};

export function useTodayComposer(): UseTodayComposerResult {
  const { user } = useAuth();
  const [requestDraft, setRequestDraft] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
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

  function toggleAnonymous(): void {
    setAnonymous((current) => !current);
  }

  async function submitRequest(bodyOverride?: string): Promise<void> {
    if (requestSubmittingRef.current) return;

    const body = (bodyOverride ?? requestDraft).trim();
    if (!body) return;

    requestSubmittingRef.current = true;
    try {
      await createRequestMutation.mutateAsync({
        body,
        anonymous: user?.nickname ? anonymous : true,
      });
      setRequestDraft("");
      setJustSubmitted(true);
    } finally {
      requestSubmittingRef.current = false;
    }
  }

  const requestSubmitStatus = toRequestSubmitStatus(
    createRequestMutation.isPending,
    justSubmitted,
  );

  return {
    requestDraft,
    requestSubmitStatus,
    todayEntryMessages,
    requestCount: requests.length,
    replyCount: requests.reduce((sum, request) => sum + request.replyCount, 0),
    nickname: user?.nickname ?? null,
    anonymous,
    updateRequestDraft,
    toggleAnonymous,
    submitRequest,
  };
}
