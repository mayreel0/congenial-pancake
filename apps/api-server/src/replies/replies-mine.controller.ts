import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GuestId } from '../common/decorators/guest-id.decorator';
import { OptionalCurrentUser } from '../auth/optional-current-user.decorator';
import { OptionalSessionGuard } from '../auth/optional-session.guard';
import { isValidDateString, kstDateRange } from '../common/kst-date';
import {
  parsePageParam,
  parsePageSizeParam,
  toPaginatedDto,
  type PaginatedDto,
} from '../common/pagination.dto';
import { UsersService } from '../users/users.service';
import {
  toMyAnswerLogEntryDto,
  type MyAnswerLogEntryDto,
} from './dto/my-answer-log-entry.dto';
import { RepliesService } from './replies.service';

// Separate from RepliesController because that one is nested under
// requests/:requestId/replies — this route is top-level (/replies/mine),
// not scoped to one request.
@ApiTags('replies')
@Controller('replies')
export class RepliesMineController {
  constructor(
    private readonly repliesService: RepliesService,
    private readonly usersService: UsersService,
  ) {}

  // "내 기록" → 내가 남긴 답변, filtered to the given KST date range
  // (default: unbounded — full history). See RequestsController.mine for
  // the equivalent on the 고민 tab.
  @Get('mine')
  @UseGuards(OptionalSessionGuard)
  async mine(
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string,
    @Query('from') fromParam: string | undefined,
    @Query('to') toParam: string | undefined,
    @Query('page') pageParam: string | undefined,
    @Query('pageSize') pageSizeParam: string | undefined,
  ): Promise<PaginatedDto<MyAnswerLogEntryDto>> {
    const from =
      fromParam && isValidDateString(fromParam) ? fromParam : undefined;
    const to = toParam && isValidDateString(toParam) ? toParam : undefined;
    const page = parsePageParam(pageParam);
    const pageSize = parsePageSizeParam(pageSizeParam);

    const { items, totalItems } = await this.repliesService.findMine(
      userId,
      guestId,
      kstDateRange(from, to),
      { page, pageSize },
    );
    const authorIds = items.flatMap((entry) => [
      entry.request.authorId,
      entry.reply.authorId,
    ]);
    const nicknameByUserId = await this.usersService.nicknameMapFor(
      authorIds.filter((id): id is string => id !== null),
    );
    return toPaginatedDto(
      items.map((entry) => toMyAnswerLogEntryDto(entry, nicknameByUserId)),
      page,
      totalItems,
      pageSize,
    );
  }
}
