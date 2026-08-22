"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRequest,
  fetchHeldRequests,
  fetchQueueCandidate,
  holdRequest,
  listRequests,
  skipRequest,
} from "./api";

export const requestKeys = {
  list: ["requests", "list"] as const,
  queue: ["requests", "queue"] as const,
  held: ["requests", "held"] as const,
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
    mutationFn: (body: string) => createRequest(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: requestKeys.list });
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
