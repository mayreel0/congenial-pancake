import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import {
  parsePageParam,
  parsePageSizeParam,
  toPaginatedDto,
  type PaginatedDto,
} from '../common/pagination.dto';
import {
  toFeedItemDto,
  FeedItemResponseDto,
} from '../requests/dto/feed-item.dto';
import type { FeedItem } from '../requests/requests.repository';
import { UsersService } from '../users/users.service';
import {
  PublicProfileDto,
  type PublicReplyItemDto,
  type PublicRequestItemDto,
} from './dto/public-profile.dto';
import { ProfileService } from './profile.service';

// Public — no auth guard. Reachable from anywhere a nickname is shown
// (/read, /answer, /records) so anyone recognizes the same person across
// posts, same as /read itself needs no session.
@ApiTags('users')
@Controller('users')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly usersService: UsersService,
  ) {}

  @Get(':nickname/:discriminator')
  @ZodResponse({ type: PublicProfileDto })
  async profile(
    @Param('nickname') nickname: string,
    @Param('discriminator') discriminator: string,
  ): Promise<PublicProfileDto> {
    const profile = await this.profileService.findProfile(
      nickname,
      discriminator,
    );
    if (!profile) throw new NotFoundException();
    return profile;
  }

  // "모두 보기" — 남긴 고민 전체를 페이지네이션으로.
  @Get(':nickname/:discriminator/requests')
  async requests(
    @Param('nickname') nickname: string,
    @Param('discriminator') discriminator: string,
    @Query('page') pageParam: string | undefined,
    @Query('pageSize') pageSizeParam: string | undefined,
  ): Promise<PaginatedDto<PublicRequestItemDto>> {
    const page = parsePageParam(pageParam);
    const pageSize = parsePageSizeParam(pageSizeParam);
    const result = await this.profileService.findRequestsPage(
      nickname,
      discriminator,
      { page, pageSize },
    );
    if (!result) throw new NotFoundException();
    return toPaginatedDto(result.items, page, result.totalItems, pageSize);
  }

  // "모두 보기" — 남긴 답변 전체를 페이지네이션으로.
  @Get(':nickname/:discriminator/replies')
  async replies(
    @Param('nickname') nickname: string,
    @Param('discriminator') discriminator: string,
    @Query('page') pageParam: string | undefined,
    @Query('pageSize') pageSizeParam: string | undefined,
  ): Promise<PaginatedDto<PublicReplyItemDto>> {
    const page = parsePageParam(pageParam);
    const pageSize = parsePageSizeParam(pageSizeParam);
    const result = await this.profileService.findRepliesPage(
      nickname,
      discriminator,
      { page, pageSize },
    );
    if (!result) throw new NotFoundException();
    return toPaginatedDto(result.items, page, result.totalItems, pageSize);
  }

  // 고민 상세 — that request's full public thread (request + every visible
  // reply to it, including other people's replies), same response shape
  // /read's feed uses.
  @Get(':nickname/:discriminator/requests/:requestId')
  @ZodResponse({ type: FeedItemResponseDto })
  async requestThread(
    @Param('nickname') nickname: string,
    @Param('discriminator') discriminator: string,
    @Param('requestId') requestId: string,
  ): Promise<FeedItemResponseDto> {
    const item = await this.profileService.findRequestThread(
      nickname,
      discriminator,
      requestId,
    );
    if (!item) throw new NotFoundException();
    return this.toThreadDto(item);
  }

  // 답변 상세 — same thread shape as requestThread; the frontend already
  // knows which replyId it navigated from and highlights that one itself.
  @Get(':nickname/:discriminator/replies/:replyId')
  @ZodResponse({ type: FeedItemResponseDto })
  async replyThread(
    @Param('nickname') nickname: string,
    @Param('discriminator') discriminator: string,
    @Param('replyId') replyId: string,
  ): Promise<FeedItemResponseDto> {
    const item = await this.profileService.findReplyThread(
      nickname,
      discriminator,
      replyId,
    );
    if (!item) throw new NotFoundException();
    return this.toThreadDto(item);
  }

  private async toThreadDto(item: FeedItem): Promise<FeedItemResponseDto> {
    const authorIds = [
      item.request.authorId,
      ...item.replies.map((reply) => reply.authorId),
    ].filter((id): id is string => id !== null);
    const nicknameByUserId = await this.usersService.nicknameMapFor(authorIds);
    return toFeedItemDto(item, nicknameByUserId);
  }
}
