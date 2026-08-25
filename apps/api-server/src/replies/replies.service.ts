import { Injectable } from '@nestjs/common';
import { AnswerInteractionsService } from '../answer-interactions/answer-interactions.service';
import {
  ReplyAlreadySubmittedException,
  ReplyGuestLimitExceededException,
  RequestNotFoundException,
} from '../common/exceptions/app.exception';
import { RequestsService } from '../requests/requests.service';
import type { CreateReplyDto } from './dto/create-reply.dto';
import {
  RepliesRepository,
  type ReplyRecord,
  type ReplyWithRequest,
} from './replies.repository';

// See docs/decisions/2026-08-21-onseol-anonymous-posting-decisions.md — a
// global budget per guestId across every request, not per-request.
const GUEST_REPLY_LIMIT = 5;

@Injectable()
export class RepliesService {
  constructor(
    private readonly repliesRepository: RepliesRepository,
    private readonly requestsService: RequestsService,
    private readonly answerInteractionsService: AnswerInteractionsService,
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

    const guestReplyCount = await this.repliesRepository.countByGuest(guestId);
    if (guestReplyCount >= GUEST_REPLY_LIMIT) {
      throw new ReplyGuestLimitExceededException();
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
