"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteRequest, restoreRequest } from "./api";
import {
  fetchAdminRequests,
  type AdminRequestListFilters,
} from "./content-api";

const adminContentKeys = {
  requests: (filters: AdminRequestListFilters) =>
    ["admin", "requests", filters] as const,
};

export function useAdminRequestsQuery(
  filters: AdminRequestListFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: adminContentKeys.requests(filters),
    queryFn: () => fetchAdminRequests(filters),
    enabled,
    retry: false,
  });
}

// Also invalidates the 신고 검토 큐(["admin","moderation","hidden"]) — it
// reads the exact same underlying rows via a separate query key, so a
// restore/delete here would otherwise leave that other screen showing a
// stale entry until its own next unrelated refetch.
function useInvalidateAdminRequests() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "requests"] });
    void queryClient.invalidateQueries({
      queryKey: ["admin", "moderation", "hidden"],
    });
  };
}

export function useAdminRestoreRequestMutation() {
  const invalidate = useInvalidateAdminRequests();
  return useMutation({
    mutationFn: (id: string) => restoreRequest(id),
    onSuccess: () => void invalidate(),
  });
}

export function useAdminDeleteRequestMutation() {
  const invalidate = useInvalidateAdminRequests();
  return useMutation({
    mutationFn: (id: string) => deleteRequest(id),
    onSuccess: () => void invalidate(),
  });
}
