"use client";

import type { AdminReplyResponseDto, AdminRequestResponseDto } from "shared/dto";
import { useAdminAccess } from "./lib/admin/useAdminAccess";
import {
  useDeleteReplyMutation,
  useDeleteRequestMutation,
  useHiddenModerationQueueQuery,
  useRestoreReplyMutation,
  useRestoreRequestMutation,
} from "./lib/admin/queries";

type UseAdminReviewResult = {
  // "is this session even allowed to see this" lives in useAdminAccess now
  // (shared across every admin page) — this only covers the in-between
  // window after access is confirmed but the queue GET is still in flight.
  isLoadingQueue: boolean;
  hiddenRequests: AdminRequestResponseDto[];
  hiddenReplies: AdminReplyResponseDto[];
  restoreRequest(id: string): Promise<void>;
  deleteRequest(id: string): Promise<void>;
  restoreReply(id: string): Promise<void>;
  deleteReply(id: string): Promise<void>;
};

export function useAdminReview(): UseAdminReviewResult {
  const { status } = useAdminAccess();
  const enabled = status === "ready";

  const hiddenQuery = useHiddenModerationQueueQuery(enabled);
  const restoreRequestMutation = useRestoreRequestMutation();
  const deleteRequestMutation = useDeleteRequestMutation();
  const restoreReplyMutation = useRestoreReplyMutation();
  const deleteReplyMutation = useDeleteReplyMutation();

  return {
    isLoadingQueue: hiddenQuery.isLoading,
    hiddenRequests: hiddenQuery.data?.requests ?? [],
    hiddenReplies: hiddenQuery.data?.replies ?? [],
    restoreRequest: (id) => restoreRequestMutation.mutateAsync(id),
    deleteRequest: (id) => deleteRequestMutation.mutateAsync(id),
    restoreReply: (id) => restoreReplyMutation.mutateAsync(id),
    deleteReply: (id) => deleteReplyMutation.mutateAsync(id),
  };
}
