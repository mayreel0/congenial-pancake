import type { SettingsResponseDto } from "shared/dto";
import { apiFetch } from "../api";

export type AdminSettingsDto = SettingsResponseDto;

export type UpdateAdminSettingsInput = Partial<
  Pick<
    AdminSettingsDto,
    | "queueFreshnessHours"
    | "queueReplyCap"
    | "guestReplyLimit"
    | "nicknameCooldownDays"
  >
>;

export function fetchAdminSettings(): Promise<AdminSettingsDto> {
  return apiFetch<AdminSettingsDto>("/admin/settings");
}

export function updateAdminSettings(
  input: UpdateAdminSettingsInput,
): Promise<AdminSettingsDto> {
  return apiFetch<AdminSettingsDto>("/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
