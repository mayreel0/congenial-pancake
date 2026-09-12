"use client";

import { errorMessage } from "../lib/api";
import { useAdminAccess } from "../lib/admin/useAdminAccess";
import type { SettingsResponseDto } from "shared/dto";
import {
  useAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
} from "../lib/admin/settings-queries";

type UseAdminSettingsResult = {
  settings: SettingsResponseDto | undefined;
  // "is this session even allowed to see this" lives in useAdminAccess now
  // (shared across every admin page) — this only covers the in-between
  // window after access is confirmed but the settings GET is still in
  // flight.
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

function toUpdateError(error: unknown): string | null {
  if (!error) return null;
  return errorMessage(error);
}

export function useAdminSettings(): UseAdminSettingsResult {
  const { status } = useAdminAccess();
  const enabled = status === "ready";

  const settingsQuery = useAdminSettingsQuery(enabled);
  const updateMutation = useUpdateAdminSettingsMutation();

  const updateError = toUpdateError(updateMutation.error);

  return {
    settings: settingsQuery.data,
    isLoadingSettings: settingsQuery.isLoading,
    updating: updateMutation.isPending,
    updateError,
    update: (input) => updateMutation.mutateAsync(input).then(() => undefined),
  };
}
