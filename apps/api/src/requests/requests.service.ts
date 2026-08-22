import { Injectable } from '@nestjs/common';
import {
  GuestIdRequiredException,
  RequestGuestLimitExceededException,
} from '../common/exceptions/app.exception';
import type { CreateRequestDto } from './dto/create-request.dto';
import {
  RequestsRepository,
  type FeedItem,
  type RequestRecord,
  type RequestWithReplyCount,
} from './requests.repository';

@Injectable()
export class RequestsService {
  constructor(private readonly requestsRepository: RequestsRepository) {}

  async create(
    dto: CreateRequestDto,
    userId: string | undefined,
    guestId: string | undefined,
  ): Promise<RequestRecord> {
    if (userId) {
      return this.requestsRepository.create({
        body: dto.body,
        authorId: userId,
      });
    }

    if (!guestId) throw new GuestIdRequiredException();

    const existing = await this.requestsRepository.findByGuestId(guestId);
    if (existing) throw new RequestGuestLimitExceededException();

    return this.requestsRepository.create({ body: dto.body, guestId });
  }

  findVisible(): Promise<RequestWithReplyCount[]> {
    return this.requestsRepository.findVisible();
  }

  findVisibleById(id: string): Promise<RequestRecord | undefined> {
    return this.requestsRepository.findVisibleById(id);
  }

  findFeed(): Promise<FeedItem[]> {
    return this.requestsRepository.findFeed();
  }

  async findQueueCandidate(
    userId: string | undefined,
    guestId: string | undefined,
  ): Promise<RequestWithReplyCount | undefined> {
    if (!userId && !guestId) throw new GuestIdRequiredException();
    return this.requestsRepository.findQueueCandidate(
      userId ? { authorId: userId } : { guestId },
    );
  }

  hide(id: string): Promise<void> {
    return this.requestsRepository.setHidden(id, true);
  }
}
