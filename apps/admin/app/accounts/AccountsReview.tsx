"use client";

import { AdminShell } from "../components/AdminShell";
import { AdminStatusGate } from "../components/AdminStatusGate";
import { useAdminAccess } from "../lib/admin/useAdminAccess";
import { AccountForm } from "./AccountForm";
import { useAccountsAdmin } from "./useAccountsAdmin";

export function AccountsReview() {
  const access = useAdminAccess();
  const admin = useAccountsAdmin();

  return (
    <AdminShell activePath="/accounts">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        <AdminStatusGate status={access.status}>
          <AccountForm
            issueError={admin.issueError}
            issueLink={admin.issueLink}
            issuing={admin.issuing}
            reset={admin.reset}
            url={admin.url}
          />
        </AdminStatusGate>
      </main>
    </AdminShell>
  );
}
