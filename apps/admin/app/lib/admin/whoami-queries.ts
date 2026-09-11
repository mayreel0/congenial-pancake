"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAdminWhoami } from "./whoami-api";

const adminWhoamiKeys = {
  whoami: ["admin", "whoami"] as const,
};

// enabled: false while auth is still resolving or the viewer isn't logged
// in — matches useAdminSettingsQuery's reasoning.
export function useAdminWhoamiQuery(enabled: boolean) {
  return useQuery({
    queryKey: adminWhoamiKeys.whoami,
    queryFn: fetchAdminWhoami,
    enabled,
    retry: false,
  });
}
