import { createZodDto } from 'nestjs-zod';
import { settingsResponseSchema } from 'shared/dto';
import type { SettingsRecord } from '../settings.repository';

export class SettingsResponseDto extends createZodDto(settingsResponseSchema) {}

export function toSettingsResponseDto(
  settings: SettingsRecord,
): SettingsResponseDto {
  return {
    queueFreshnessHours: settings.queueFreshnessHours,
    queueReplyCap: settings.queueReplyCap,
    guestReplyLimit: settings.guestReplyLimit,
    nicknameCooldownDays: settings.nicknameCooldownDays,
    updatedAt: settings.updatedAt.toISOString(),
  };
}
