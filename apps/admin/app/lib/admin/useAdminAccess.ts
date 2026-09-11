"use client";

import { ApiError } from "../api";
import { useAuth } from "../auth/useAuth";
import { useAdminWhoamiQuery } from "./whoami-queries";

type AdminAccessStatus = "loading" | "signedOut" | "forbidden" | "ready";

type UseAdminAccessResult = {
  status: AdminAccessStatus;
  login(email: string, password: string): Promise<void>;
};

function toStatus(
  authStatus: ReturnType<typeof useAuth>["status"],
  whoamiLoading: boolean,
  forbidden: boolean,
): AdminAccessStatus {
  if (authStatus === "loading") return "loading";
  if (authStatus === "anonymous") return "signedOut";
  if (whoamiLoading) return "loading";
  if (forbidden) return "forbidden";
  return "ready";
}

// Single source of truth for "is this session allowed into apps/admin" —
// every page (the / gate and the three feature pages) derives its status
// from this instead of each re-deriving its own via a page-specific GET's
// 401/403 (that's still how the feature pages gate their own data queries,
// but no longer how they decide whether to render at all). See
// docs/decisions/2026-08-25-onseol-admin-moderation-decisions.md for the
// original per-page pattern this replaces.
export function useAdminAccess(): UseAdminAccessResult {
  const { status: authStatus, login } = useAuth();
  const enabled = authStatus === "authenticated";
  const whoamiQuery = useAdminWhoamiQuery(enabled);

  const forbidden =
    whoamiQuery.error instanceof ApiError &&
    (whoamiQuery.error.statusCode === 403 ||
      whoamiQuery.error.statusCode === 401);

  return {
    status: toStatus(authStatus, whoamiQuery.isLoading, forbidden),
    login,
  };
}
