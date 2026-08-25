import { Injectable } from '@nestjs/common';
import { RequestGuestLimitExceededException } from '../common/exceptions/app.exception';
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
    guestId: string,
  ): Promise<RequestRecord> {
    if (userId) {
      return this.requestsRepository.create({
        body: dto.body,
        authorId: userId,
      });
    }

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

  findQueueCandidate(
    userId: string | undefined,
    guestId: string,
  ): Promise<RequestWithReplyCount | undefined> {
    return this.requestsRepository.findQueueCandidate(
      userId ? { authorId: userId } : { guestId },
    );
  }

  hide(id: string): Promise<void> {
    return this.requestsRepository.setHidden(id, true);
  }

  findHidden(): Promise<RequestRecord[]> {
    return this.requestsRepository.findHidden();
  }

  restore(id: string): Promise<void> {
    return this.requestsRepository.restore(id);
  }

  softDelete(id: string): Promise<void> {
    return this.requestsRepository.softDelete(id);
  }
}
