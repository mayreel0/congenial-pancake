"use client";

import { ApiError } from "./lib/api";
import { useAuth } from "./lib/auth/useAuth";
import type { AdminReplyResponseDto, AdminRequestResponseDto } from "shared/dto";
import {
  useDeleteReplyMutation,
  useDeleteRequestMutation,
  useHiddenModerationQueueQuery,
  useRestoreReplyMutation,
  useRestoreRequestMutation,
} from "./lib/admin/queries";

type UseAdminReviewResult = {
  status: "loading" | "signedOut" | "forbidden" | "ready";
  hiddenRequests: AdminRequestResponseDto[];
  hiddenReplies: AdminReplyResponseDto[];
  restoreRequest(id: string): Promise<void>;
  deleteRequest(id: string): Promise<void>;
  restoreReply(id: string): Promise<void>;
  deleteReply(id: string): Promise<void>;
};

function toStatus(
  authStatus: ReturnType<typeof useAuth>["status"],
  forbidden: boolean,
): UseAdminReviewResult["status"] {
  if (authStatus === "loading") return "loading";
  if (authStatus === "anonymous") return "signedOut";
  if (forbidden) return "forbidden";
  return "ready";
}

// 화이트리스트(ADMIN_USER_IDS) 여부는 서버만 알고 있어 클라이언트가 미리
// 판단할 수 없다 — 로그인 상태에서 쿼리를 실행해보고 403이면 권한 없음으로
// 처리한다. See docs/decisions/2026-08-25-onseol-admin-moderation-decisions.md.
export function useAdminReview(): UseAdminReviewResult {
  const { status: authStatus } = useAuth();
  const enabled = authStatus === "authenticated";

  const hiddenQuery = useHiddenModerationQueueQuery(enabled);
  const restoreRequestMutation = useRestoreRequestMutation();
  const deleteRequestMutation = useDeleteRequestMutation();
  const restoreReplyMutation = useRestoreReplyMutation();
  const deleteReplyMutation = useDeleteReplyMutation();

  const forbidden =
    hiddenQuery.error instanceof ApiError &&
    (hiddenQuery.error.statusCode === 403 ||
      hiddenQuery.error.statusCode === 401);

  const status = toStatus(authStatus, forbidden);

  return {
    status,
    hiddenRequests: hiddenQuery.data?.requests ?? [],
    hiddenReplies: hiddenQuery.data?.replies ?? [],
    restoreRequest: (id) => restoreRequestMutation.mutateAsync(id),
    deleteRequest: (id) => deleteRequestMutation.mutateAsync(id),
    restoreReply: (id) => restoreReplyMutation.mutateAsync(id),
    deleteReply: (id) => deleteReplyMutation.mutateAsync(id),
  };
}
