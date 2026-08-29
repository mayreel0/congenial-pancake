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

    const [requests, repliesWithRequest] = await Promise.all([
      this.requestsService.findPublicByAuthor(user.id),
      this.repliesService.findPublicByAuthor(user.id),
    ]);

    return {
      nickname: user.nickname,
      nicknameDiscriminator: nicknameDiscriminator(user.id),
      requests: requests.map((request) => ({
        id: request.id,
        body: request.body,
        createdAt: request.createdAt,
      })),
      replies: repliesWithRequest.map(({ reply, request }) => ({
        id: reply.id,
        body: reply.body,
        createdAt: reply.createdAt,
        requestId: request.id,
        requestBody: request.body,
      })),
    };
  }
}
