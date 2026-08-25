import type { SettingsRecord } from '../settings.repository';

export type SettingsResponseDto = {
  queueFreshnessHours: number;
  queueReplyCap: number;
  guestReplyLimit: number;
  updatedAt: Date;
};

export function toSettingsResponseDto(
  settings: SettingsRecord,
): SettingsResponseDto {
  return {
    queueFreshnessHours: settings.queueFreshnessHours,
    queueReplyCap: settings.queueReplyCap,
    guestReplyLimit: settings.guestReplyLimit,
    updatedAt: settings.updatedAt,
  };
}
