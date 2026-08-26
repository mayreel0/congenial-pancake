"use client";

import { AdminNav } from "../components/AdminNav";
import { AdminStatusGate } from "../components/AdminStatusGate";
import { useAuth } from "../lib/auth/useAuth";
import { AccountForm } from "./AccountForm";
import { useAccountsAdmin } from "./useAccountsAdmin";

export function AccountsReview() {
  const auth = useAuth();
  const admin = useAccountsAdmin();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AdminNav activePath="/accounts" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        <AdminStatusGate status={admin.status} login={auth.login}>
          <AccountForm
            issueError={admin.issueError}
            issueLink={admin.issueLink}
            issuing={admin.issuing}
            reset={admin.reset}
            url={admin.url}
          />
        </AdminStatusGate>
      </main>
    </div>
  );
}
