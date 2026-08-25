import { apiFetch } from "../api";

export type AdminSettingsDto = {
  queueFreshnessHours: number;
  queueReplyCap: number;
  guestReplyLimit: number;
  updatedAt: string;
};

export type UpdateAdminSettingsInput = Partial<
  Pick<AdminSettingsDto, "queueFreshnessHours" | "queueReplyCap" | "guestReplyLimit">
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
