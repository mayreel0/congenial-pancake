import { Injectable } from '@nestjs/common';
import { RepliesService } from '../replies/replies.service';
import { RequestsService } from '../requests/requests.service';
import { UsersService } from '../users/users.service';
import { nicknameDiscriminator } from '../users/nickname-discriminator';
import type { PublicProfileDto } from './dto/public-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly usersService: UsersService,
    private readonly requestsService: RequestsService,
    private readonly repliesService: RepliesService,
  ) {}

  // undefined when nobody currently holds this exact nickname — including
  // the case where they once did but have since renamed/cleared it (see
  // UsersService.findByNicknameAndDiscriminator).
  async findProfile(
    nickname: string,
    discriminator: string,
  ): Promise<PublicProfileDto | undefined> {
    const user = await this.usersService.findByNicknameAndDiscriminator(
      nickname,
      discriminator,
    );
    if (!user || !user.nickname) return undefined;

    // Always fetched regardless of the visibility switches below — the
    // count switch is independent of the list switches, so a hidden list
    // can still need its count, and computing "just the count" separately
    // would be premature optimization for what's a tiny list at this
    // project's scale.
    const [requests, repliesWithRequest] = await Promise.all([
      this.requestsService.findPublicByAuthor(user.id),
      this.repliesService.findPublicByAuthor(user.id),
    ]);

    return {
      nickname: user.nickname,
      nicknameDiscriminator: nicknameDiscriminator(user.id),
      requestsVisible: user.showRequestsOnProfile,
      repliesVisible: user.showRepliesOnProfile,
      countsVisible: user.showCountsOnProfile,
      requestCount: user.showCountsOnProfile ? requests.length : null,
      replyCount: user.showCountsOnProfile ? repliesWithRequest.length : null,
      requests: user.showRequestsOnProfile
        ? requests.map((request) => ({
            id: request.id,
            body: request.body,
            createdAt: request.createdAt,
          }))
        : [],
      replies: user.showRepliesOnProfile
        ? repliesWithRequest.map(({ reply, request }) => ({
            id: reply.id,
            body: reply.body,
            createdAt: reply.createdAt,
            requestId: request.id,
            requestBody: request.body,
          }))
        : [],
    };
  }
}
