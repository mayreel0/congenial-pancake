import type { SettingsRecord } from '../settings.repository';

export type SettingsResponseDto = {
  queueFreshnessHours: number;
  queueReplyCap: number;
  guestReplyLimit: number;
  nicknameCooldownDays: number;
  updatedAt: Date;
};

export function toSettingsResponseDto(
  settings: SettingsRecord,
): SettingsResponseDto {
  return {
    queueFreshnessHours: settings.queueFreshnessHours,
    queueReplyCap: settings.queueReplyCap,
    guestReplyLimit: settings.guestReplyLimit,
    nicknameCooldownDays: settings.nicknameCooldownDays,
    updatedAt: settings.updatedAt,
  };
}
