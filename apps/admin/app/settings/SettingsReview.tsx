"use client";

import { AdminNav } from "../components/AdminNav";
import { AdminStatusGate } from "../components/AdminStatusGate";
import { useAuth } from "../lib/auth/useAuth";
import { SettingsForm } from "./SettingsForm";
import { useAdminSettings } from "./useAdminSettings";

export function SettingsReview() {
  const auth = useAuth();
  const admin = useAdminSettings();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AdminNav activePath="/settings" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        <AdminStatusGate status={admin.status} login={auth.login}>
          {admin.settings ? (
            <SettingsForm
              settings={admin.settings}
              updating={admin.updating}
              updateError={admin.updateError}
              update={admin.update}
            />
          ) : null}
        </AdminStatusGate>
      </main>
    </div>
  );
}
