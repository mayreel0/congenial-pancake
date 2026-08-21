import { Injectable } from '@nestjs/common';
import {
  GuestIdRequiredException,
  ReplyAlreadySubmittedException,
  ReplyGuestLimitExceededException,
  RequestNotFoundException,
} from '../common/exceptions/app.exception';
import { RequestsService } from '../requests/requests.service';
import type { CreateReplyDto } from './dto/create-reply.dto';
import { RepliesRepository, type ReplyRecord } from './replies.repository';

const GUEST_REPLY_LIMIT_PER_REQUEST = 5;

@Injectable()
export class RepliesService {
  constructor(
    private readonly repliesRepository: RepliesRepository,
    private readonly requestsService: RequestsService,
  ) {}

  async create(
    requestId: string,
    dto: CreateReplyDto,
    userId: string | undefined,
    guestId: string | undefined,
  ): Promise<ReplyRecord> {
    const request = await this.requestsService.findVisibleById(requestId);
    if (!request) throw new RequestNotFoundException();

    if (userId) {
      const existing = await this.repliesRepository.findByRequestAndAuthor(
        requestId,
        userId,
      );
      if (existing) throw new ReplyAlreadySubmittedException();

      return this.repliesRepository.create({
        requestId,
        body: dto.body,
        authorId: userId,
      });
    }

    if (!guestId) throw new GuestIdRequiredException();

    const guestReplyCount = await this.repliesRepository.countByRequestAndGuest(
      requestId,
      guestId,
    );
    if (guestReplyCount >= GUEST_REPLY_LIMIT_PER_REQUEST) {
      throw new ReplyGuestLimitExceededException();
    }

    return this.repliesRepository.create({
      requestId,
      body: dto.body,
      guestId,
    });
  }

  findVisibleByRequestId(requestId: string): Promise<ReplyRecord[]> {
    return this.repliesRepository.findVisibleByRequestId(requestId);
  }

  findVisibleById(id: string): Promise<ReplyRecord | undefined> {
    return this.repliesRepository.findVisibleById(id);
  }

  hide(id: string): Promise<void> {
    return this.repliesRepository.setHidden(id, true);
  }
}
