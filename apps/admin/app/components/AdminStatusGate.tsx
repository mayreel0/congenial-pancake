"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "ui/Skeleton";
import {
  SKELETON_MIN_DISPLAY_MS,
  useMinDisplayDuration,
} from "ui/useMinDisplayDuration";

type AdminPageStatus = "loading" | "signedOut" | "forbidden" | "ready";

type AdminStatusGateProps = {
  status: AdminPageStatus;
  children: ReactNode;
};

// Shared by every feature page (신고 검토/설정/계정 — all three derive their
// status from useAdminAccess). Unlike the version this replaced, signedOut/
// forbidden no longer render inline here — they redirect to the dedicated /
// gate (AdminGate), which is the only place that actually shows the login
// form or the "접근 권한이 없어요" message now. This means a feature page's
// real URL (e.g. /review) is never reachable content for an unauthenticated
// or unauthorized visitor, only its shell briefly flashes a skeleton while
// the redirect is in flight.
export function AdminStatusGate({ status, children }: AdminStatusGateProps) {
  const router = useRouter();
  const showSkeleton = useMinDisplayDuration(
    status === "loading",
    SKELETON_MIN_DISPLAY_MS,
  );

  useEffect(() => {
    if (status === "signedOut" || status === "forbidden") {
      router.replace("/");
    }
  }, [status, router]);

  // A generic shape, not per-page — this gate doesn't know whether it's
  // loading AdminReview's list or SettingsReview's form, and both pages'
  // own content is briefly blank while the redirect (or the auth check
  // itself) is in flight.
  if (showSkeleton || status === "signedOut" || status === "forbidden") {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((key) => (
          <div
            className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm"
            key={key}
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }
  return <>{children}</>;
}
