import { Injectable } from '@nestjs/common';
import {
  SettingsRepository,
  type SettingsRecord,
  type UpdateSettingsInput,
} from './settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  get(): Promise<SettingsRecord> {
    return this.settingsRepository.get();
  }

  update(input: UpdateSettingsInput): Promise<SettingsRecord> {
    return this.settingsRepository.update(input);
  }
}
