"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestKeys } from "../requests/queries";
import {
  createReply,
  fetchMyAnswerLog,
  fetchSavedReplyIds,
  saveReply,
  unsaveReply,
} from "./api";

export const replyKeys = {
  mine: ["replies", "mine"] as const,
  saved: ["replies", "saved"] as const,
};

export function useMyAnswerLogQuery() {
  return useQuery({
    queryKey: replyKeys.mine,
    queryFn: fetchMyAnswerLog,
  });
}

export function useCreateReplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, body }: { requestId: string; body: string }) =>
      createReply(requestId, body),
    // Awaited so the caller's mutateAsync only resolves once the queue/held
    // queries have actually refetched — otherwise the UI could briefly show
    // the just-answered request as still current.
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: requestKeys.queue }),
        queryClient.invalidateQueries({ queryKey: requestKeys.held }),
        queryClient.invalidateQueries({ queryKey: requestKeys.feed }),
        queryClient.invalidateQueries({ queryKey: replyKeys.mine }),
      ]);
    },
  });
}

// Saved replies are member-only — pass enabled: false for guests instead of
// letting the query fire and 401.
export function useSavedReplyIdsQuery(enabled: boolean) {
  return useQuery({
    queryKey: replyKeys.saved,
    queryFn: fetchSavedReplyIds,
    enabled,
  });
}

export function useSaveReplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (replyId: string) => saveReply(replyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: replyKeys.saved });
    },
  });
}

export function useUnsaveReplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (replyId: string) => unsaveReply(replyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: replyKeys.saved });
    },
  });
}
