"use client";

import { AdminNav } from "../components/AdminNav";
import { AdminStatusGate } from "../components/AdminStatusGate";
import { useAdminAccess } from "../lib/admin/useAdminAccess";
import { Skeleton } from "ui/Skeleton";
import { Toast } from "ui/Toast";
import { useToast } from "ui/useToast";
import {
  SKELETON_MIN_DISPLAY_MS,
  useMinDisplayDuration,
} from "ui/useMinDisplayDuration";
import { FIELDS, SettingsForm } from "./SettingsForm";
import { useAdminSettings } from "./useAdminSettings";

// The auth check clearing (AdminStatusGate's own "loading") doesn't mean the
// settings GET has resolved yet — this covers that in-between window. Reuses
// SettingsForm's own FIELDS list so the real labels/hints stay put and only
// the actual values (which need the GET to resolve) turn into skeletons —
// matches 2026-09-10 UX audit feedback on /me's equivalent case. The "설정"
// heading itself lives outside AdminStatusGate now (see SettingsReview),
// same as AdminReview's "신고 검토" — so it's not repeated here.
function SettingsFormSkeleton() {
  return (
    <div className="space-y-6">
      {FIELDS.map((field) => (
        <div className="space-y-1" key={field.key}>
          <label className="block text-sm font-semibold text-foreground">
            {field.label}
          </label>
          <p className="text-xs text-muted">{field.hint}</p>
          <Skeleton className="h-10 w-40" />
        </div>
      ))}
      <Skeleton className="h-10 w-24" />
    </div>
  );
}

export function SettingsReview() {
  const access = useAdminAccess();
  const admin = useAdminSettings();
  const { toast, showSuccess, dismiss } = useToast();
  const showSkeleton = useMinDisplayDuration(
    admin.isLoadingSettings,
    SKELETON_MIN_DISPLAY_MS,
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AdminNav activePath="/settings" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        <h1 className="text-lg font-semibold text-foreground">설정</h1>
        <AdminStatusGate status={access.status}>
          {showSkeleton ? (
            <SettingsFormSkeleton />
          ) : (
            admin.settings && (
              <SettingsForm
                settings={admin.settings}
                updating={admin.updating}
                updateError={admin.updateError}
                update={admin.update}
                onSaved={() => showSuccess("저장했어요.")}
              />
            )
          )}
        </AdminStatusGate>
      </main>
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
