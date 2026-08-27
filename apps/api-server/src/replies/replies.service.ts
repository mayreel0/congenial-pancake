import { Injectable } from '@nestjs/common';
import { AnswerInteractionsService } from '../answer-interactions/answer-interactions.service';
import {
  ReplyAlreadySubmittedException,
  ReplyGuestLimitExceededException,
  ReplyUnverifiedLimitExceededException,
  RequestNotFoundException,
} from '../common/exceptions/app.exception';
import { RequestsService } from '../requests/requests.service';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import type { CreateReplyDto } from './dto/create-reply.dto';
import {
  RepliesRepository,
  type ReplyRecord,
  type ReplyWithRequest,
} from './replies.repository';

@Injectable()
export class RepliesService {
  constructor(
    private readonly repliesRepository: RepliesRepository,
    private readonly requestsService: RequestsService,
    private readonly answerInteractionsService: AnswerInteractionsService,
    private readonly settingsService: SettingsService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    requestId: string,
    dto: CreateReplyDto,
    userId: string | undefined,
    guestId: string,
  ): Promise<ReplyRecord> {
    const request = await this.requestsService.findVisibleById(requestId);
    if (!request) throw new RequestNotFoundException();

    if (userId) {
      const existing = await this.repliesRepository.findByRequestAndAuthor(
        requestId,
        userId,
      );
      if (existing) throw new ReplyAlreadySubmittedException();

      // An unverified member is capped the same as a guest — otherwise
      // hitting the guest cap is trivially bypassed by signing up with any
      // unverified email. Verified members stay uncapped.
      const user = await this.usersService.findById(userId);
      if (!user?.emailVerifiedAt) {
        const [authorReplyCount, settings] = await Promise.all([
          this.repliesRepository.countByAuthor(userId),
          this.settingsService.get(),
        ]);
        if (authorReplyCount >= settings.guestReplyLimit) {
          throw new ReplyUnverifiedLimitExceededException(
            settings.guestReplyLimit,
          );
        }
      }

      const reply = await this.repliesRepository.create({
        requestId,
        body: dto.body,
        authorId: userId,
      });
      // Answering a held request resolves it — it shouldn't linger in the
      // hold panel once there's a reply for it.
      await this.answerInteractionsService.clearForViewer(
        requestId,
        userId,
        undefined,
      );
      return reply;
    }

    // See docs/decisions/2026-08-21-onseol-anonymous-posting-decisions.md —
    // a global budget per guestId across every request, not per-request.
    const [guestReplyCount, settings] = await Promise.all([
      this.repliesRepository.countByGuest(guestId),
      this.settingsService.get(),
    ]);
    if (guestReplyCount >= settings.guestReplyLimit) {
      throw new ReplyGuestLimitExceededException(settings.guestReplyLimit);
    }

    const reply = await this.repliesRepository.create({
      requestId,
      body: dto.body,
      guestId,
    });
    await this.answerInteractionsService.clearForViewer(
      requestId,
      undefined,
      guestId,
    );
    return reply;
  }

  findVisibleByRequestId(requestId: string): Promise<ReplyRecord[]> {
    return this.repliesRepository.findVisibleByRequestId(requestId);
  }

  findVisibleById(id: string): Promise<ReplyRecord | undefined> {
    return this.repliesRepository.findVisibleById(id);
  }

  findMine(
    userId: string | undefined,
    guestId: string,
  ): Promise<ReplyWithRequest[]> {
    return this.repliesRepository.findMine(
      userId ? { authorId: userId } : { guestId },
    );
  }

  hide(id: string): Promise<void> {
    return this.repliesRepository.setHidden(id, true);
  }

  findHidden(): Promise<ReplyWithRequest[]> {
    return this.repliesRepository.findHidden();
  }

  restore(id: string): Promise<void> {
    return this.repliesRepository.restore(id);
  }

  softDelete(id: string): Promise<void> {
    return this.repliesRepository.softDelete(id);
  }
}
