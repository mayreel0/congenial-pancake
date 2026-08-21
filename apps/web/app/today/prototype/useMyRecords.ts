"use client";

// Not wired into any page yet — prepared for when /me shows the viewer's own
// requests/replies. Kept here instead of deleted since it's the natural
// building block for that page once it needs real data.

import {
  getMyReplies,
  getMyRequests,
  getPriorityRequests,
  getRecentExchanges,
  getVisibleRepliesForRequest,
  hasViewerReplied,
} from "./model";
import { usePrototypeStorage } from "./usePrototypeStorage";
import type { OnseolReply, OnseolRequest } from "./types";

type UseMyRecordsResult = {
  priorityRequests: OnseolRequest[];
  selectedRequest: OnseolRequest | null;
  selectedReplies: OnseolReply[];
  recentExchanges: Array<{ request: OnseolRequest; reply: OnseolReply | null }>;
  myRequests: OnseolRequest[];
  myReplies: OnseolReply[];
  hasViewerRepliedToSelected: boolean;
  selectRequest(requestId: string): void;
};

export function useMyRecords(): UseMyRecordsResult {
  const { state, updateState } = usePrototypeStorage();
  const now = new Date();

  const priorityRequests = getPriorityRequests(state, now);
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

  function selectRequest(requestId: string): void {
    updateState((current) => ({ ...current, selectedRequestId: requestId }));
  }

  return {
    priorityRequests,
    selectedRequest,
    selectedReplies,
    recentExchanges,
    myRequests,
    myReplies,
    hasViewerRepliedToSelected: selectedRequest
      ? hasViewerReplied(state, selectedRequest.id)
      : false,
    selectRequest,
  };
}
