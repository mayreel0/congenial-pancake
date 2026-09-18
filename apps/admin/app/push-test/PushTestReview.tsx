"use client";

import { AdminShell } from "../components/AdminShell";
import { AdminStatusGate } from "../components/AdminStatusGate";
import { useAdminAccess } from "../lib/admin/useAdminAccess";
import { PushTestForm } from "./PushTestForm";
import { usePushTestAdmin } from "./usePushTestAdmin";

export function PushTestReview() {
  const access = useAdminAccess();
  const admin = usePushTestAdmin();

  return (
    <AdminShell activePath="/push-test">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        <AdminStatusGate status={access.status}>
          <PushTestForm
            reset={admin.reset}
            send={admin.send}
            sendError={admin.sendError}
            sending={admin.sending}
            subscriptionCount={admin.subscriptionCount}
          />
        </AdminStatusGate>
      </main>
    </AdminShell>
  );
}
