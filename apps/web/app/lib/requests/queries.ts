"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createRequest,
  fetchFeed,
  fetchFeedDayCounts,
  fetchHeldRequests,
  fetchMyRequestDayCounts,
  fetchMyRequestLog,
  fetchQueueCandidate,
  holdRequest,
  listRequests,
  skipRequest,
} from "./api";

export const requestKeys = {
  list: ["requests", "list"] as const,
  queue: ["requests", "queue"] as const,
  held: ["requests", "held"] as const,
  // Prefix keys — pass to invalidateQueries to match every feed(...)/
  // mine(...) variant regardless of its date/page/pageSize args.
  feedAll: ["requests", "feed"] as const,
  feed: (date: string | undefined, page: number, pageSize: number) =>
    ["requests", "feed", date ?? null, page, pageSize] as const,
  mineAll: ["requests", "mine"] as const,
  mine: (
    from: string | undefined,
    to: string | undefined,
    page: number,
    pageSize: number,
  ) => ["requests", "mine", from ?? null, to ?? null, page, pageSize] as const,
  // HeatmapCalendar day counts — keyed by the visible month's from/to.
  feedCounts: (from: string, to: string) =>
    ["requests", "feedCounts", from, to] as const,
  mineCounts: (from: string, to: string) =>
    ["requests", "mineCounts", from, to] as const,
};

export function useRequestsQuery() {
  return useQuery({
    queryKey: requestKeys.list,
    queryFn: listRequests,
  });
}

export function useCreateRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, anonymous }: { body: string; anonymous?: boolean }) =>
      createRequest(body, anonymous),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: requestKeys.list });
      void queryClient.invalidateQueries({ queryKey: requestKeys.mineAll });
    },
  });
}

export function useQueueQuery() {
  return useQuery({
    queryKey: requestKeys.queue,
    queryFn: fetchQueueCandidate,
  });
}

// Held requests are member-only — pass enabled: false for guests instead of
// letting the query fire and 401.
export function useHeldRequestsQuery(enabled: boolean) {
  return useQuery({
    queryKey: requestKeys.held,
    queryFn: fetchHeldRequests,
    enabled,
  });
}

// skip/hold return the next queue candidate directly, so the response
// replaces requests/queue's cache instead of triggering a second fetch.
export function useSkipMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => skipRequest(requestId),
    onSuccess: (next) => {
      queryClient.setQueryData(requestKeys.queue, next);
    },
  });
}

// keepPreviousData avoids a full loading-state flash on page change — the
// previous page's items stay on screen (still tagged isPlaceholderData)
// until the new page resolves.
export function useFeedQuery(
  date: string | undefined,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: requestKeys.feed(date, page, pageSize),
    queryFn: () => fetchFeed(date, page, pageSize),
    placeholderData: keepPreviousData,
  });
}

export function useFeedDayCountsQuery(from: string, to: string) {
  return useQuery({
    queryKey: requestKeys.feedCounts(from, to),
    queryFn: () => fetchFeedDayCounts(from, to),
    placeholderData: keepPreviousData,
  });
}

export function useMyRequestDayCountsQuery(from: string, to: string) {
  return useQuery({
    queryKey: requestKeys.mineCounts(from, to),
    queryFn: () => fetchMyRequestDayCounts(from, to),
    placeholderData: keepPreviousData,
  });
}

export function useMyRequestLogQuery(
  from: string | undefined,
  to: string | undefined,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: requestKeys.mine(from, to, page, pageSize),
    queryFn: () => fetchMyRequestLog(from, to, page, pageSize),
    placeholderData: keepPreviousData,
  });
}

export function useHoldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => holdRequest(requestId),
    onSuccess: (next) => {
      queryClient.setQueryData(requestKeys.queue, next);
      void queryClient.invalidateQueries({ queryKey: requestKeys.held });
    },
  });
}
