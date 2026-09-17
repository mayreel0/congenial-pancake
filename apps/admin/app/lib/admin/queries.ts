"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteReply,
  deleteRequest,
  fetchHiddenModerationQueue,
  restoreReply,
  restoreRequest,
} from "./api";

const adminKeys = {
  hidden: ["admin", "moderation", "hidden"] as const,
};

// enabled: false while auth is still resolving or the viewer isn't logged
// in — otherwise this fires and 401/403s before we know whether to show
// the "no access" state instead of a real error toast.
export function useHiddenModerationQueueQuery(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.hidden,
    queryFn: fetchHiddenModerationQueue,
    enabled,
    retry: false,
  });
}

// 고민 관리/답변 관리(content-queries.ts) 화면도 같은 requests/replies 행을
// 다른 쿼리 키로 보여준다 — 신고 검토에서 복구/삭제해도 그 화면들이 stale로
// 남지 않도록 여기서도 같이 invalidate한다. 요청 쪽 mutation은 requests
// 목록만, 답장 쪽은 replies 목록만 추가로 건드리면 된다(둘 다 건드릴 필요 없음).
function useInvalidateHiddenQueue(contentKey: "requests" | "replies") {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.hidden });
    void queryClient.invalidateQueries({ queryKey: ["admin", contentKey] });
  };
}

export function useRestoreRequestMutation() {
  const invalidate = useInvalidateHiddenQueue("requests");
  return useMutation({
    mutationFn: (id: string) => restoreRequest(id),
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteRequestMutation() {
  const invalidate = useInvalidateHiddenQueue("requests");
  return useMutation({
    mutationFn: (id: string) => deleteRequest(id),
    onSuccess: () => void invalidate(),
  });
}

export function useRestoreReplyMutation() {
  const invalidate = useInvalidateHiddenQueue("replies");
  return useMutation({
    mutationFn: (id: string) => restoreReply(id),
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteReplyMutation() {
  const invalidate = useInvalidateHiddenQueue("replies");
  return useMutation({
    mutationFn: (id: string) => deleteReply(id),
    onSuccess: () => void invalidate(),
  });
}
