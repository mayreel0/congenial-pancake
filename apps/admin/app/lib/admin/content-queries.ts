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

function useInvalidateAdminRequests() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "requests"] });
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
