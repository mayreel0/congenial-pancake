import { Injectable } from '@nestjs/common';
import { RepliesService } from '../replies/replies.service';
import { RequestsService } from '../requests/requests.service';
import type {
  FeedItem,
  PagedResult,
  Pagination,
} from '../requests/requests.repository';
import { UsersService } from '../users/users.service';
import { nicknameDiscriminator } from '../users/nickname-discriminator';
import {
  toPublicReplyItemDto,
  toPublicRequestItemDto,
  type PublicProfileDto,
  type PublicReplyItemDto,
  type PublicRequestItemDto,
} from './dto/public-profile.dto';

// How many of a profile's own recent posts show inline on /u/[slug] before
// linking out to the full paginated list — small enough to keep the main
// page short, big enough to be a meaningful preview.
export const PROFILE_PREVIEW_SIZE = 5;

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

    const previewPagination: Pagination = {
      page: 1,
      pageSize: PROFILE_PREVIEW_SIZE,
    };

    // Always fetched regardless of the visibility switches below — the
    // count switch is independent of the list switches, so a hidden list
    // can still need its count. Only the first page is fetched either way
    // (this is a preview, not the full list), but totalItems from that same
    // paginated query is still the true count, not just this page's size.
    const [requestsPage, repliesPage] = await Promise.all([
      this.requestsService.findPublicByAuthor(user.id, previewPagination),
      this.repliesService.findPublicByAuthor(user.id, previewPagination),
    ]);

    return {
      nickname: user.nickname,
      nicknameDiscriminator: nicknameDiscriminator(user.id),
      requestsVisible: user.showRequestsOnProfile,
      repliesVisible: user.showRepliesOnProfile,
      countsVisible: user.showCountsOnProfile,
      requestCount: user.showCountsOnProfile ? requestsPage.totalItems : null,
      replyCount: user.showCountsOnProfile ? repliesPage.totalItems : null,
      requests: user.showRequestsOnProfile
        ? requestsPage.items.map(toPublicRequestItemDto)
        : [],
      replies: user.showRepliesOnProfile
        ? repliesPage.items.map(toPublicReplyItemDto)
        : [],
    };
  }

  // "모두 보기" — GET /users/:nickname/:discriminator/requests. undefined
  // both when the profile itself isn't findable and when the owner has
  // this list turned off, so a stale/shared link 404s the same way the
  // whole profile does when the nickname is hidden, rather than exposing
  // an empty-but-real page for a list the owner chose to hide.
  async findRequestsPage(
    nickname: string,
    discriminator: string,
    pagination: Pagination,
  ): Promise<PagedResult<PublicRequestItemDto> | undefined> {
    const user = await this.usersService.findByNicknameAndDiscriminator(
      nickname,
      discriminator,
    );
    if (!user || !user.nickname || !user.showRequestsOnProfile) {
      return undefined;
    }

    const page = await this.requestsService.findPublicByAuthor(
      user.id,
      pagination,
    );
    return {
      items: page.items.map(toPublicRequestItemDto),
      totalItems: page.totalItems,
    };
  }

  // "모두 보기" — GET /users/:nickname/:discriminator/replies.
  async findRepliesPage(
    nickname: string,
    discriminator: string,
    pagination: Pagination,
  ): Promise<PagedResult<PublicReplyItemDto> | undefined> {
    const user = await this.usersService.findByNicknameAndDiscriminator(
      nickname,
      discriminator,
    );
    if (!user || !user.nickname || !user.showRepliesOnProfile) {
      return undefined;
    }

    const page = await this.repliesService.findPublicByAuthor(
      user.id,
      pagination,
    );
    return {
      items: page.items.map(toPublicReplyItemDto),
      totalItems: page.totalItems,
    };
  }

  // 고민 상세 — the request must belong to this exact profile owner and be
  // one they chose to reveal (anonymous: false), the same condition that
  // makes it eligible for the "남긴 고민" list in the first place. Returns
  // the full thread (request + every visible reply, including other
  // people's) — same shape /read's feed uses, since this is public content
  // either way.
  async findRequestThread(
    nickname: string,
    discriminator: string,
    requestId: string,
  ): Promise<FeedItem | undefined> {
    const user = await this.usersService.findByNicknameAndDiscriminator(
      nickname,
      discriminator,
    );
    if (!user || !user.nickname || !user.showRequestsOnProfile) {
      return undefined;
    }

    const item = await this.requestsService.findFeedItemById(requestId);
    if (!item || item.request.authorId !== user.id || item.request.anonymous) {
      return undefined;
    }
    return item;
  }

  // 답변 상세 — resolves the reply's parent request, then returns that same
  // full-thread shape as findRequestThread. The frontend already knows
  // which replyId it navigated from (it's in the URL) and highlights that
  // one itself, so the response doesn't need to flag it separately.
  async findReplyThread(
    nickname: string,
    discriminator: string,
    replyId: string,
  ): Promise<FeedItem | undefined> {
    const user = await this.usersService.findByNicknameAndDiscriminator(
      nickname,
      discriminator,
    );
    if (!user || !user.nickname || !user.showRepliesOnProfile) {
      return undefined;
    }

    const reply = await this.repliesService.findVisibleById(replyId);
    if (!reply || reply.authorId !== user.id || reply.anonymous) {
      return undefined;
    }

    return this.requestsService.findFeedItemById(reply.requestId);
  }
}
