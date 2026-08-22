import { Injectable } from '@nestjs/common';
import { GuestIdRequiredException } from '../common/exceptions/app.exception';
import { AnswerInteractionsRepository } from './answer-interactions.repository';

@Injectable()
export class AnswerInteractionsService {
  constructor(
    private readonly answerInteractionsRepository: AnswerInteractionsRepository,
  ) {}

  async skip(
    requestId: string,
    userId: string | undefined,
    guestId: string | undefined,
  ): Promise<void> {
    if (userId) {
      await this.answerInteractionsRepository.upsertMemberSkip(
        requestId,
        userId,
      );
      return;
    }

    if (!guestId) throw new GuestIdRequiredException();
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

  findHeldForAuthor(userId: string) {
    return this.answerInteractionsRepository.findHeldForAuthor(userId);
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
