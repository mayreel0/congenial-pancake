"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  SKELETON_MIN_DISPLAY_MS,
  useMinDisplayDuration,
} from "ui/useMinDisplayDuration";
import { LoginForm } from "./components/LoginForm";
import { useAdminAccess } from "./lib/admin/useAdminAccess";
import { useAuth } from "./lib/auth/useAuth";

// The dedicated entry point — / is never itself a feature page. Redirects
// straight to /review the moment the session is confirmed as an authorized
// admin; otherwise shows the login form (signed out) or a forbidden message
// (logged in, but not on the admin whitelist) right here. Every feature
// page (AdminStatusGate) redirects back to this same route for both of
// those states, so this is the only place either one is ever shown.
export function AdminGate() {
  const router = useRouter();
  const { status, login } = useAdminAccess();
  const { logout } = useAuth();
  const showSkeleton = useMinDisplayDuration(
    status === "loading",
    SKELETON_MIN_DISPLAY_MS,
  );

  useEffect(() => {
    if (status === "ready") router.replace("/review");
  }, [status, router]);

  // Nothing to show while loading or already on the way to /review — a
  // brief blank beats flashing the login form right before it's replaced.
  if (showSkeleton || status === "ready") return null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
      <section className="w-full max-w-sm space-y-6">
        <p className="text-center text-sm text-muted">온설 관리</p>
        {status === "forbidden" ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted">이 계정은 접근 권한이 없어요.</p>
            <button
              className="text-sm text-muted underline-offset-2 hover:underline"
              type="button"
              onClick={() => void logout()}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <LoginForm login={login} />
        )}
      </section>
    </main>
  );
}
