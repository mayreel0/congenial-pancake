import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { AnswerInteractionsService } from '../answer-interactions/answer-interactions.service';
import { GuestId } from '../common/decorators/guest-id.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalCurrentUser } from '../auth/optional-current-user.decorator';
import { OptionalSessionGuard } from '../auth/optional-session.guard';
import { SessionGuard } from '../auth/session.guard';
import {
  isValidDateString,
  kstDateRange,
  kstDayRange,
  resolveDayCountsRange,
  yesterdayKstDateString,
} from '../common/kst-date';
import {
  toDayCountsResponseDto,
  DayCountsResponseDto,
} from '../common/dto/day-counts-response.dto';
import {
  parsePageParam,
  parsePageSizeParam,
  toPaginatedDto,
  type PaginatedDto,
} from '../common/pagination.dto';
import { UsersService } from '../users/users.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { toFeedItemDto, type FeedItemResponseDto } from './dto/feed-item.dto';
import {
  toMyRequestLogEntryDto,
  type MyRequestLogEntryDto,
} from './dto/my-request-log-entry.dto';
import {
  RequestResponseDto,
  toRequestResponseDto,
} from './dto/request-response.dto';
import { RequestsService } from './requests.service';
import type { RequestRecord } from './requests.repository';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly answerInteractionsService: AnswerInteractionsService,
    private readonly usersService: UsersService,
  ) {}

  // Batches nickname lookups for a list response instead of one query per
  // row — see UsersService.nicknameMapFor.
  private nicknameMapFor(
    records: Pick<RequestRecord, 'authorId'>[],
  ): Promise<Map<string, string | null>> {
    const authorIds = records
      .map((record) => record.authorId)
      .filter((id): id is string => id !== null);
    return this.usersService.nicknameMapFor(authorIds);
  }

  @Post()
  @UseGuards(OptionalSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse({ status: HttpStatus.CREATED, type: RequestResponseDto })
  async create(
    @Body() dto: CreateRequestDto,
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string,
  ): Promise<RequestResponseDto> {
    const request = await this.requestsService.create(dto, userId, guestId);
    const nicknameByUserId = await this.nicknameMapFor([request]);
    return toRequestResponseDto(request, nicknameByUserId);
  }

  @Get()
  @ZodResponse({ type: [RequestResponseDto] })
  async findAll(): Promise<RequestResponseDto[]> {
    const requests = await this.requestsService.findVisible();
    const nicknameByUserId = await this.nicknameMapFor(requests);
    return requests.map((request) =>
      toRequestResponseDto(request, nicknameByUserId),
    );
  }

  // /read's feed: every visible request that has at least one visible reply
  // on the given KST calendar day (default: yesterday), newest first, with
  // its replies nested (oldest first). "그날의 온설" is browsed one day at a
  // time, not as one continuously-scrolling feed.
  @Get('feed')
  async feed(
    @Query('date') dateParam: string | undefined,
    @Query('page') pageParam: string | undefined,
    @Query('pageSize') pageSizeParam: string | undefined,
  ): Promise<PaginatedDto<FeedItemResponseDto> & { date: string }> {
    const date =
      dateParam && isValidDateString(dateParam)
        ? dateParam
        : yesterdayKstDateString();
    const page = parsePageParam(pageParam);
    const pageSize = parsePageSizeParam(pageSizeParam);

    const { items, totalItems } = await this.requestsService.findFeed(
      kstDayRange(date),
      { page, pageSize },
    );
    const authorIds = items.flatMap((item) => [
      item.request.authorId,
      ...item.replies.map((reply) => reply.authorId),
    ]);
    const nicknameByUserId = await this.usersService.nicknameMapFor(
      authorIds.filter((id): id is string => id !== null),
    );
    return {
      ...toPaginatedDto(
        items.map((item) => toFeedItemDto(item, nicknameByUserId)),
        page,
        totalItems,
        pageSize,
      ),
      date,
    };
  }

  // HeatmapCalendar day counts for /read — same "at least one reply"
  // definition as feed() above, just grouped by day instead of paginated.
  // from/to default to the current KST month when missing/invalid.
  @Get('feed/counts')
  @ZodResponse({ type: DayCountsResponseDto })
  async feedCounts(
    @Query('from') fromParam: string | undefined,
    @Query('to') toParam: string | undefined,
  ): Promise<DayCountsResponseDto> {
    const { from, to } = resolveDayCountsRange(fromParam, toParam);
    const rows = await this.requestsService.countFeedByDay(
      kstDateRange(from, to),
    );
    return toDayCountsResponseDto(from, to, rows);
  }

  // "내 기록" → 내가 작성한 고민: every request this member posted in the
  // given KST date range (default: unbounded — full history), each with
  // its full reply thread — member-only since a guest has no persistent
  // identity to look this up by later.
  @Get('mine')
  @UseGuards(SessionGuard)
  async mine(
    @CurrentUser() userId: string,
    @Query('from') fromParam: string | undefined,
    @Query('to') toParam: string | undefined,
    @Query('page') pageParam: string | undefined,
    @Query('pageSize') pageSizeParam: string | undefined,
  ): Promise<PaginatedDto<MyRequestLogEntryDto>> {
    const from =
      fromParam && isValidDateString(fromParam) ? fromParam : undefined;
    const to = toParam && isValidDateString(toParam) ? toParam : undefined;
    const page = parsePageParam(pageParam);
    const pageSize = parsePageSizeParam(pageSizeParam);

    const { items, totalItems } = await this.requestsService.findMine(
      userId,
      kstDateRange(from, to),
      { page, pageSize },
    );
    const authorIds = items.flatMap((item) => [
      item.request.authorId,
      ...item.replies.map((reply) => reply.authorId),
    ]);
    const nicknameByUserId = await this.usersService.nicknameMapFor(
      authorIds.filter((id): id is string => id !== null),
    );
    return toPaginatedDto(
      items.map((item) => toMyRequestLogEntryDto(item, nicknameByUserId)),
      page,
      totalItems,
      pageSize,
    );
  }

  // HeatmapCalendar day counts for /records' 내가 남긴 고민 tab — same
  // member-only, unfiltered-own-content scope as mine() above.
  @Get('mine/counts')
  @UseGuards(SessionGuard)
  @ZodResponse({ type: DayCountsResponseDto })
  async mineCounts(
    @CurrentUser() userId: string,
    @Query('from') fromParam: string | undefined,
    @Query('to') toParam: string | undefined,
  ): Promise<DayCountsResponseDto> {
    const { from, to } = resolveDayCountsRange(fromParam, toParam);
    const rows = await this.requestsService.countMineByDay(
      userId,
      kstDateRange(from, to),
    );
    return toDayCountsResponseDto(from, to, rows);
  }

  // The single next request this viewer should answer — see
  // RequestsRepository.findQueueCandidate for the ranking rules.
  @Get('queue')
  @UseGuards(OptionalSessionGuard)
  async queue(
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string,
  ): Promise<RequestResponseDto | null> {
    const request = await this.requestsService.findQueueCandidate(
      userId,
      guestId,
    );
    if (!request) return null;
    const nicknameByUserId = await this.nicknameMapFor([request]);
    return toRequestResponseDto(request, nicknameByUserId);
  }

  // Held requires a session — see docs/decisions/2026-08-22-onseol-answer-
  // queue-decisions.md for why holding is member-only while skip is not.
  @Get('held')
  @UseGuards(SessionGuard)
  async held(@CurrentUser() userId: string): Promise<RequestResponseDto[]> {
    const rows = await this.answerInteractionsService.findHeldForAuthor(userId);
    const nicknameByUserId = await this.nicknameMapFor(
      rows.map((row) => row.request),
    );
    return rows.map((row) =>
      toRequestResponseDto(row.request, nicknameByUserId),
    );
  }

  // Returns the next queue candidate directly so the client doesn't need a
  // separate GET /requests/queue round-trip after every skip.
  @Post(':id/skip')
  @UseGuards(OptionalSessionGuard)
  @HttpCode(HttpStatus.OK)
  async skip(
    @Param('id') id: string,
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string,
  ): Promise<RequestResponseDto | null> {
    await this.answerInteractionsService.skip(id, userId, guestId);
    const next = await this.requestsService.findQueueCandidate(userId, guestId);
    if (!next) return null;
    const nicknameByUserId = await this.nicknameMapFor([next]);
    return toRequestResponseDto(next, nicknameByUserId);
  }

  // Same as skip — returns the next candidate so holding also only costs one
  // round-trip.
  @Post(':id/hold')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async hold(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @GuestId() guestId: string,
  ): Promise<RequestResponseDto | null> {
    await this.answerInteractionsService.hold(id, userId);
    const next = await this.requestsService.findQueueCandidate(userId, guestId);
    if (!next) return null;
    const nicknameByUserId = await this.nicknameMapFor([next]);
    return toRequestResponseDto(next, nicknameByUserId);
  }
}
