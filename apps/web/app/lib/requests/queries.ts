"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRequest, listRequests } from "./api";

export const requestKeys = {
  list: ["requests", "list"] as const,
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
