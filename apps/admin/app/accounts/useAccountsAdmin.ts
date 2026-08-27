"use client";

import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth/useAuth";
import { useIssuePasswordResetLinkMutation } from "../lib/admin/accounts-queries";

type UseAccountsAdminResult = {
  status: "loading" | "signedOut" | "ready";
  issuing: boolean;
  issueError: string | null;
  url: string | null;
  issueLink(email: string): Promise<void>;
  reset(): void;
};

function toStatus(
  authStatus: ReturnType<typeof useAuth>["status"],
): UseAccountsAdminResult["status"] {
  if (authStatus === "loading") return "loading";
  if (authStatus === "anonymous") return "signedOut";
  return "ready";
}

// AdminGuard's plain ForbiddenException has no custom message ("Forbidden"
// verbatim, from Nest's default) — special-case 401/403 to the same
// Korean copy AdminStatusGate shows for a precheck-based forbidden state,
// instead of surfacing that raw string.
function toIssueError(error: unknown): string | null {
  if (!error) return null;
  if (!(error instanceof ApiError)) {
    return "링크를 발급하지 못했습니다. 잠시 후 다시 시도해주세요.";
  }
  if (error.statusCode === 401 || error.statusCode === 403) {
    return "이 계정은 접근 권한이 없어요.";
  }
  return error.message;
}

// No GET query backs this page (unlike useAdminSettings/useAdminReview), so
// unlike those there's no way to know "forbidden" ahead of a real attempt —
// a non-admin session just sees the mutation's own 401/403 as issueError
// below, same as SettingsForm's updateError.
export function useAccountsAdmin(): UseAccountsAdminResult {
  const { status: authStatus } = useAuth();
  const issueMutation = useIssuePasswordResetLinkMutation();

  return {
    status: toStatus(authStatus),
    issuing: issueMutation.isPending,
    issueError: toIssueError(issueMutation.error),
    url: issueMutation.data?.url ?? null,
    issueLink: (email) => issueMutation.mutateAsync(email).then(() => undefined),
    reset: () => issueMutation.reset(),
  };
}
