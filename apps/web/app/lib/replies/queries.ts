"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestKeys } from "../requests/queries";
import { createReply, fetchMyAnswerLog } from "./api";

export const replyKeys = {
  mine: ["replies", "mine"] as const,
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
        queryClient.invalidateQueries({ queryKey: replyKeys.mine }),
      ]);
    },
  });
}
