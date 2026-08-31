import type { SettingsResponseDto } from "shared/dto";
import { apiFetch } from "../api";

export type UpdateAdminSettingsInput = Partial<
  Pick<
    SettingsResponseDto,
    | "queueFreshnessHours"
    | "queueReplyCap"
    | "guestReplyLimit"
    | "nicknameCooldownDays"
  >
>;

export function fetchAdminSettings(): Promise<SettingsResponseDto> {
  return apiFetch<SettingsResponseDto>("/admin/settings");
}

export function updateAdminSettings(
  input: UpdateAdminSettingsInput,
): Promise<SettingsResponseDto> {
  return apiFetch<SettingsResponseDto>("/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
