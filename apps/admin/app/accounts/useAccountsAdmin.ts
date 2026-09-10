"use client";

import { ApiError, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth/useAuth";
import { useIssuePasswordResetLinkMutation } from "../lib/admin/accounts-queries";
import { useAdminWhoamiQuery } from "../lib/admin/whoami-queries";

type UseAccountsAdminResult = {
  status: "loading" | "signedOut" | "forbidden" | "ready";
  issuing: boolean;
  issueError: string | null;
  url: string | null;
  issueLink(email: string): Promise<void>;
  reset(): void;
};

// Mirrors useAdminSettings's status derivation, except the whoami query's
// own loading state folds into "loading" here rather than getting its own
// in-between skeleton — unlike SettingsForm, AccountForm's initial render
// doesn't depend on any fetched data, so there's nothing worth showing
// before whoami resolves.
function toStatus(
  authStatus: ReturnType<typeof useAuth>["status"],
  whoamiLoading: boolean,
  forbidden: boolean,
): UseAccountsAdminResult["status"] {
  if (authStatus === "loading") return "loading";
  if (authStatus === "anonymous") return "signedOut";
  if (whoamiLoading) return "loading";
  if (forbidden) return "forbidden";
  return "ready";
}

// AdminGuard's plain ForbiddenException has no custom message ("Forbidden"
// verbatim, from Nest's default) — special-case 401/403 to the same
// Korean copy AdminStatusGate shows for a precheck-based forbidden state,
// instead of surfacing that raw string.
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

// No GET endpoint backs this page's actual data (unlike useAdminSettings/
// useAdminReview) — /admin/whoami exists purely as a cheap admin precheck
// so a non-admin sees "이 계정은 접근 권한이 없어요." immediately instead of
// the real form, matching those two pages instead of only discovering
// "forbidden" from the issue mutation's own 401/403 (kept below as a
// fallback for the same message in case the session changes in between).
export function useAccountsAdmin(): UseAccountsAdminResult {
  const { status: authStatus } = useAuth();
  const enabled = authStatus === "authenticated";
  const whoamiQuery = useAdminWhoamiQuery(enabled);
  const issueMutation = useIssuePasswordResetLinkMutation();

  const forbidden =
    whoamiQuery.error instanceof ApiError &&
    (whoamiQuery.error.statusCode === 403 ||
      whoamiQuery.error.statusCode === 401);

  return {
    status: toStatus(authStatus, whoamiQuery.isLoading, forbidden),
    issuing: issueMutation.isPending,
    issueError: toIssueError(issueMutation.error),
    url: issueMutation.data?.url ?? null,
    issueLink: (email) => issueMutation.mutateAsync(email).then(() => undefined),
    reset: () => issueMutation.reset(),
  };
}
