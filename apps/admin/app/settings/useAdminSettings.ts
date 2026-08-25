"use client";

import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth/useAuth";
import type { AdminSettingsDto } from "../lib/admin/settings-api";
import {
  useAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
} from "../lib/admin/settings-queries";

type UseAdminSettingsResult = {
  status: "loading" | "signedOut" | "forbidden" | "ready";
  settings: AdminSettingsDto | undefined;
  updating: boolean;
  updateError: string | null;
  update(
    input: Partial<
      Pick<AdminSettingsDto, "queueFreshnessHours" | "queueReplyCap" | "guestReplyLimit">
    >,
  ): Promise<void>;
};

// Mirrors useAdminReview's status derivation exactly — see that file's
// comment for why forbidden can only be known by actually trying the query.
export function useAdminSettings(): UseAdminSettingsResult {
  const { status: authStatus } = useAuth();
  const enabled = authStatus === "authenticated";

  const settingsQuery = useAdminSettingsQuery(enabled);
  const updateMutation = useUpdateAdminSettingsMutation();

  const forbidden =
    settingsQuery.error instanceof ApiError &&
    (settingsQuery.error.statusCode === 403 ||
      settingsQuery.error.statusCode === 401);

  const status: UseAdminSettingsResult["status"] =
    authStatus === "loading"
      ? "loading"
      : authStatus === "anonymous"
        ? "signedOut"
        : forbidden
          ? "forbidden"
          : "ready";

  const updateError =
    updateMutation.error instanceof ApiError
      ? updateMutation.error.message
      : updateMutation.error
        ? "설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요."
        : null;

  return {
    status,
    settings: settingsQuery.data,
    updating: updateMutation.isPending,
    updateError,
    update: (input) => updateMutation.mutateAsync(input).then(() => undefined),
  };
}
