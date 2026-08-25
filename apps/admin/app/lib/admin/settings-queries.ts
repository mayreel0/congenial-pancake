"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminSettings,
  updateAdminSettings,
  type UpdateAdminSettingsInput,
} from "./settings-api";

export const adminSettingsKeys = {
  settings: ["admin", "settings"] as const,
};

// enabled: false while auth is still resolving or the viewer isn't logged
// in — matches useHiddenModerationQueueQuery's reasoning.
export function useAdminSettingsQuery(enabled: boolean) {
  return useQuery({
    queryKey: adminSettingsKeys.settings,
    queryFn: fetchAdminSettings,
    enabled,
    retry: false,
  });
}

export function useUpdateAdminSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAdminSettingsInput) => updateAdminSettings(input),
    onSuccess: (settings) => {
      queryClient.setQueryData(adminSettingsKeys.settings, settings);
    },
  });
}
