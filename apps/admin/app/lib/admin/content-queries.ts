"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteReply, deleteRequest, restoreReply, restoreRequest } from "./api";
import {
  fetchAdminReplies,
  fetchAdminRequests,
  type AdminReplyListFilters,
  type AdminRequestListFilters,
} from "./content-api";

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

function useInvalidateAdminReplies() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "replies"] });
}

export function useAdminRestoreReplyMutation() {
  const invalidate = useInvalidateAdminReplies();
  return useMutation({
    mutationFn: (id: string) => restoreReply(id),
    onSuccess: () => void invalidate(),
  });
}

export function useAdminDeleteReplyMutation() {
  const invalidate = useInvalidateAdminReplies();
  return useMutation({
    mutationFn: (id: string) => deleteReply(id),
    onSuccess: () => void invalidate(),
  });
}
