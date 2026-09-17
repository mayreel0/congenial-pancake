"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminReplies,
  fetchAdminRequests,
  type AdminReplyListFilters,
  type AdminRequestListFilters,
} from "./content-api";
import {
  useDeleteReplyMutation,
  useDeleteRequestMutation,
  useRestoreReplyMutation,
  useRestoreRequestMutation,
} from "./queries";

const adminContentKeys = {
  requests: (filters: AdminRequestListFilters) =>
    ["admin", "requests", filters] as const,
  replies: (filters: AdminReplyListFilters) =>
    ["admin", "replies", filters] as const,
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

export function useAdminRepliesQuery(
  filters: AdminReplyListFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: adminContentKeys.replies(filters),
    queryFn: () => fetchAdminReplies(filters),
    enabled,
    retry: false,
  });
}

// queries.ts already invalidates both ["admin","requests"/"replies"] and the
// 신고 검토 큐 bidirectionally — re-export instead of redefining the same
// mutations under an "Admin"-prefixed name.
export {
  useRestoreRequestMutation as useAdminRestoreRequestMutation,
  useDeleteRequestMutation as useAdminDeleteRequestMutation,
  useRestoreReplyMutation as useAdminRestoreReplyMutation,
  useDeleteReplyMutation as useAdminDeleteReplyMutation,
};
