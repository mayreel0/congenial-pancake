"use client";

import { ApiError, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth/useAuth";
import type { SettingsResponseDto } from "shared/dto";
import {
  useAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
} from "../lib/admin/settings-queries";

type UseAdminSettingsResult = {
  status: "loading" | "signedOut" | "forbidden" | "ready";
  settings: SettingsResponseDto | undefined;
  // status turns "ready" as soon as the auth check clears — the settings
  // GET itself can still be in flight after that, which this covers.
  isLoadingSettings: boolean;
  updating: boolean;
  updateError: string | null;
  update(
    input: Partial<
      Pick<
        SettingsResponseDto,
        | "queueFreshnessHours"
        | "queueReplyCap"
        | "guestReplyLimit"
        | "nicknameCooldownDays"
      >
    >,
  ): Promise<void>;
};

// Mirrors useAdminReview's status derivation exactly — see that file's
// comment for why forbidden can only be known by actually trying the query.
function toStatus(
  authStatus: ReturnType<typeof useAuth>["status"],
  forbidden: boolean,
): UseAdminSettingsResult["status"] {
  if (authStatus === "loading") return "loading";
  if (authStatus === "anonymous") return "signedOut";
  if (forbidden) return "forbidden";
  return "ready";
}

function toUpdateError(error: unknown): string | null {
  if (!error) return null;
  return errorMessage(error);
}

export function useAdminSettings(): UseAdminSettingsResult {
  const { status: authStatus } = useAuth();
  const enabled = authStatus === "authenticated";

  const settingsQuery = useAdminSettingsQuery(enabled);
  const updateMutation = useUpdateAdminSettingsMutation();

  const forbidden =
    settingsQuery.error instanceof ApiError &&
    (settingsQuery.error.statusCode === 403 ||
      settingsQuery.error.statusCode === 401);

  const status = toStatus(authStatus, forbidden);
  const updateError = toUpdateError(updateMutation.error);

  return {
    status,
    settings: settingsQuery.data,
    isLoadingSettings: settingsQuery.isLoading,
    updating: updateMutation.isPending,
    updateError,
    update: (input) => updateMutation.mutateAsync(input).then(() => undefined),
  };
}
