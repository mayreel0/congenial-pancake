"use client";

import type { ReactNode } from "react";
import { Skeleton } from "ui/Skeleton";
import {
  SKELETON_MIN_DISPLAY_MS,
  useMinDisplayDuration,
} from "ui/useMinDisplayDuration";
import { LoginForm } from "./LoginForm";

export type AdminPageStatus = "loading" | "signedOut" | "forbidden" | "ready";

type AdminStatusGateProps = {
  status: AdminPageStatus;
  login(email: string, password: string): Promise<void>;
  children: ReactNode;
};

// Shared by every admin page (AdminReview, SettingsReview — both derive the
// exact same status union from useAuth() + a page-specific "forbidden"
// check) to avoid duplicating a 4-way loading/signedOut/forbidden/ready
// ternary chain in each one. Early returns instead of nested ternaries.
export function AdminStatusGate({ status, login, children }: AdminStatusGateProps) {
  const showSkeleton = useMinDisplayDuration(
    status === "loading",
    SKELETON_MIN_DISPLAY_MS,
  );

  // A generic shape, not per-page — this gate doesn't know whether it's
  // loading AdminReview's list or SettingsReview's form, and both pages'
  // own content is briefly blank while the auth check itself is in flight.
  if (showSkeleton) {
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
  if (status === "signedOut") return <LoginForm login={login} />;
  if (status === "forbidden") {
    return (
      <p className="py-16 text-center text-sm text-muted">
        이 계정은 접근 권한이 없어요.
      </p>
    );
  }
  return <>{children}</>;
}
