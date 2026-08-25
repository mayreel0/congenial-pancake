"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteReply,
  deleteRequest,
  fetchHiddenModerationQueue,
  restoreReply,
  restoreRequest,
} from "./api";

export const adminKeys = {
  hidden: ["admin", "moderation", "hidden"] as const,
};

// enabled: false while auth is still resolving or the viewer isn't logged
// in — otherwise this fires and 401/403s before we know whether to show
// the "no access" state instead of a real error toast.
export function useHiddenModerationQueueQuery(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.hidden,
    queryFn: fetchHiddenModerationQueue,
    enabled,
    retry: false,
  });
}

function useInvalidateHiddenQueue() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.hidden });
}

export function useRestoreRequestMutation() {
  const invalidate = useInvalidateHiddenQueue();
  return useMutation({
    mutationFn: (id: string) => restoreRequest(id),
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteRequestMutation() {
  const invalidate = useInvalidateHiddenQueue();
  return useMutation({
    mutationFn: (id: string) => deleteRequest(id),
    onSuccess: () => void invalidate(),
  });
}

export function useRestoreReplyMutation() {
  const invalidate = useInvalidateHiddenQueue();
  return useMutation({
    mutationFn: (id: string) => restoreReply(id),
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteReplyMutation() {
  const invalidate = useInvalidateHiddenQueue();
  return useMutation({
    mutationFn: (id: string) => deleteReply(id),
    onSuccess: () => void invalidate(),
  });
}
