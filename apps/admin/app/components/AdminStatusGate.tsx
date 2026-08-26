"use client";

import type { ReactNode } from "react";
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
  if (status === "loading") return null;
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
