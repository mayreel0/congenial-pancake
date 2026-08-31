"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { requestKeys } from "../requests/queries";
import {
  createReply,
  fetchMyAnswerLog,
  fetchSavedReplyIds,
  saveReply,
  unsaveReply,
} from "./api";

export const replyKeys = {
  // Prefix key — pass to invalidateQueries to match every mine(...) variant
  // regardless of its from/to/page args.
  mineAll: ["replies", "mine"] as const,
  mine: (from: string | undefined, to: string | undefined, page: number) =>
    ["replies", "mine", from ?? null, to ?? null, page] as const,
  saved: ["replies", "saved"] as const,
};

export function useMyAnswerLogQuery(
  from: string | undefined,
  to: string | undefined,
  page: number,
) {
  return useQuery({
    queryKey: replyKeys.mine(from, to, page),
    queryFn: () => fetchMyAnswerLog(from, to, page),
    placeholderData: keepPreviousData,
  });
}

// /answer's chat-style history: page 1 is the most recent (backend default
// sort), and each further page is progressively older — exactly the
// "scroll up to load older" shape, so fetchNextPage here means "further
// into the past," not "later." Separate from useMyAnswerLogQuery (used by
// /records' numbered pager) since the two need different react-query
// primitives for the same underlying endpoint.
export function useMyAnswerLogInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: [...replyKeys.mineAll, "infinite"],
    queryFn: ({ pageParam }) => fetchMyAnswerLog(undefined, undefined, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function useCreateReplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      body,
      anonymous,
    }: {
      requestId: string;
      body: string;
      anonymous?: boolean;
    }) => createReply(requestId, body, anonymous),
    // Awaited so the caller's mutateAsync only resolves once the queue/held
    // queries have actually refetched — otherwise the UI could briefly show
    // the just-answered request as still current.
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: requestKeys.queue }),
        queryClient.invalidateQueries({ queryKey: requestKeys.held }),
        queryClient.invalidateQueries({ queryKey: requestKeys.feedAll }),
        queryClient.invalidateQueries({ queryKey: replyKeys.mineAll }),
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
