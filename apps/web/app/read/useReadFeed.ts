"use client";

import { useAuth } from "../lib/auth/useAuth";
import type { FeedItemDto } from "../lib/requests/api";
import { useFeedQuery } from "../lib/requests/queries";
import {
  useSavedReplyIdsQuery,
  useSaveReplyMutation,
  useUnsaveReplyMutation,
} from "../lib/replies/queries";
import { useCreateReportMutation } from "../lib/reports/queries";

type UseReadFeedResult = {
  readFeed: FeedItemDto[];
  savedReplyIds: string[];
  // Save and report both require a login (see docs/decisions/2026-08-22-
  // onseol-answer-queue-decisions.md) — gated together here, matching
  // /answer's canManageCurrentRequest.
  canManage: boolean;
  reportRequest(requestId: string): Promise<void>;
  reportReply(replyId: string): Promise<void>;
  toggleSavedReply(replyId: string): Promise<void>;
};

export function useReadFeed(): UseReadFeedResult {
  const { status } = useAuth();
  const canManage = status === "authenticated";

  const feedQuery = useFeedQuery();
  const savedQuery = useSavedReplyIdsQuery(canManage);
  const saveMutation = useSaveReplyMutation();
  const unsaveMutation = useUnsaveReplyMutation();
  const reportMutation = useCreateReportMutation();

  const savedReplyIds = savedQuery.data ?? [];

  async function reportRequest(requestId: string): Promise<void> {
    await reportMutation.mutateAsync({
      targetType: "request",
      targetId: requestId,
    });
  }

  async function reportReply(replyId: string): Promise<void> {
    await reportMutation.mutateAsync({
      targetType: "reply",
      targetId: replyId,
    });
  }

  async function toggleSavedReply(replyId: string): Promise<void> {
    if (savedReplyIds.includes(replyId)) {
      await unsaveMutation.mutateAsync(replyId);
    } else {
      await saveMutation.mutateAsync(replyId);
    }
  }

  return {
    readFeed: feedQuery.data ?? [],
    savedReplyIds,
    canManage,
    reportRequest,
    reportReply,
    toggleSavedReply,
  };
}
