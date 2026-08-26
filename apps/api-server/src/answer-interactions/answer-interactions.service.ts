import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { AnswerInteractionsRepository } from './answer-interactions.repository';

@Injectable()
export class AnswerInteractionsService {
  constructor(
    private readonly answerInteractionsRepository: AnswerInteractionsRepository,
    private readonly settingsService: SettingsService,
  ) {}

  async skip(
    requestId: string,
    userId: string | undefined,
    guestId: string,
  ): Promise<void> {
    if (userId) {
      await this.answerInteractionsRepository.upsertMemberSkip(
        requestId,
        userId,
      );
      return;
    }

    await this.answerInteractionsRepository.upsertGuestSkip(requestId, guestId);
  }

  // Holding requires a session — the controller route is behind SessionGuard
  // (not OptionalSessionGuard), so userId here is always real.
  hold(requestId: string, userId: string): Promise<void> {
    return this.answerInteractionsRepository.upsertMemberHold(
      requestId,
      userId,
    );
  }

  async findHeldForAuthor(userId: string) {
    const settings = await this.settingsService.get();
    return this.answerInteractionsRepository.findHeldForAuthor(
      userId,
      settings.queueFreshnessHours,
    );
  }

  clearForViewer(
    requestId: string,
    userId: string | undefined,
    guestId: string | undefined,
  ): Promise<void> {
    return this.answerInteractionsRepository.deleteForViewer(
      requestId,
      userId,
      guestId,
    );
  }
}
