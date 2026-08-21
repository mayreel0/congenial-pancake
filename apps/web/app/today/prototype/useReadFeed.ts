"use client";

import { useMemo } from "react";
import { getPriorityRequests, getReadFeed } from "./model";
import type { ReadFeedItem } from "./model";
import { usePrototypeStorage } from "./usePrototypeStorage";

type UseReadFeedResult = {
  readFeed: ReadFeedItem[];
  savedReplyIds: string[];
  reportRequest(requestId: string): void;
  reportReply(replyId: string): void;
  toggleSavedReply(replyId: string): void;
};

export function useReadFeed(): UseReadFeedResult {
  const { state, updateState } = usePrototypeStorage();
  const readFeed = useMemo(() => getReadFeed(state), [state]);

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

  return {
    readFeed,
    savedReplyIds: state.savedReplyIds,
    reportRequest,
    reportReply,
    toggleSavedReply,
  };
}
