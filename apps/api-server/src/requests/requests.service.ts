import { Injectable } from '@nestjs/common';
import {
  NicknameRequiredException,
  RequestGuestLimitExceededException,
} from '../common/exceptions/app.exception';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import type { CreateRequestDto } from './dto/create-request.dto';
import {
  RequestsRepository,
  type FeedItem,
  type RequestRecord,
  type RequestWithReplyCount,
} from './requests.repository';

@Injectable()
export class RequestsService {
  constructor(
    private readonly requestsRepository: RequestsRepository,
    private readonly settingsService: SettingsService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreateRequestDto,
    userId: string | undefined,
    guestId: string,
  ): Promise<RequestRecord> {
    if (userId) {
      // A guest can never post non-anonymously — dto.anonymous is only
      // meaningful here, on the member path.
      const anonymous = dto.anonymous !== false;
      if (!anonymous) {
        const user = await this.usersService.findById(userId);
        if (!user?.nickname) throw new NicknameRequiredException();
      }
      return this.requestsRepository.create({
        body: dto.body,
        authorId: userId,
        anonymous,
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

  findMine(authorId: string): Promise<FeedItem[]> {
    return this.requestsRepository.findMine(authorId);
  }

  async findQueueCandidate(
    userId: string | undefined,
    guestId: string,
  ): Promise<RequestWithReplyCount | undefined> {
    const settings = await this.settingsService.get();
    return this.requestsRepository.findQueueCandidate(
      userId ? { authorId: userId } : { guestId },
      {
        freshnessHours: settings.queueFreshnessHours,
        replyCap: settings.queueReplyCap,
      },
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
