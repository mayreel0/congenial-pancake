"use client";

import { AdminNav } from "../components/AdminNav";
import { AdminStatusGate } from "../components/AdminStatusGate";
import { useAuth } from "../lib/auth/useAuth";
import { Skeleton } from "ui/Skeleton";
import {
  SKELETON_MIN_DISPLAY_MS,
  useMinDisplayDuration,
} from "ui/useMinDisplayDuration";
import { SettingsForm } from "./SettingsForm";
import { useAdminSettings } from "./useAdminSettings";

// The auth check clearing (AdminStatusGate's own "loading") doesn't mean the
// settings GET has resolved yet — this covers that in-between window.
function SettingsFormSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2, 3].map((key) => (
        <div className="space-y-2" key={key}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-24" />
    </div>
  );
}

export function SettingsReview() {
  const auth = useAuth();
  const admin = useAdminSettings();
  const showSkeleton = useMinDisplayDuration(
    admin.isLoadingSettings,
    SKELETON_MIN_DISPLAY_MS,
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AdminNav activePath="/settings" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        <AdminStatusGate status={admin.status} login={auth.login}>
          {showSkeleton ? (
            <SettingsFormSkeleton />
          ) : (
            admin.settings && (
              <SettingsForm
                settings={admin.settings}
                updating={admin.updating}
                updateError={admin.updateError}
                update={admin.update}
              />
            )
          )}
        </AdminStatusGate>
      </main>
    </div>
  );
}
