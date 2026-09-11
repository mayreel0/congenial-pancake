"use client";

import { ApiError, errorMessage } from "../lib/api";
import { useIssuePasswordResetLinkMutation } from "../lib/admin/accounts-queries";

type UseAccountsAdminResult = {
  issuing: boolean;
  issueError: string | null;
  url: string | null;
  issueLink(email: string): Promise<void>;
  reset(): void;
};

// AdminGuard's plain ForbiddenException has no custom message ("Forbidden"
// verbatim, from Nest's default) — special-case 401/403 to the same
// Korean copy the / gate shows for useAdminAccess's own forbidden state,
// instead of surfacing that raw string. This only matters if the session
// changes in between (useAdminAccess already gates whether this form even
// renders in the first place).
function toIssueError(error: unknown): string | null {
  if (!error) return null;
  if (
    error instanceof ApiError &&
    (error.statusCode === 401 || error.statusCode === 403)
  ) {
    return "이 계정은 접근 권한이 없어요.";
  }
  return errorMessage(error);
}

export function useAccountsAdmin(): UseAccountsAdminResult {
  const issueMutation = useIssuePasswordResetLinkMutation();

  return {
    issuing: issueMutation.isPending,
    issueError: toIssueError(issueMutation.error),
    url: issueMutation.data?.url ?? null,
    issueLink: (email) => issueMutation.mutateAsync(email).then(() => undefined),
    reset: () => issueMutation.reset(),
  };
}
