import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnswerInteractionsService } from '../answer-interactions/answer-interactions.service';
import { GuestId } from '../common/decorators/guest-id.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalCurrentUser } from '../auth/optional-current-user.decorator';
import { OptionalSessionGuard } from '../auth/optional-session.guard';
import { SessionGuard } from '../auth/session.guard';
import { CreateRequestDto } from './dto/create-request.dto';
import { toFeedItemDto, type FeedItemResponseDto } from './dto/feed-item.dto';
import {
  toRequestResponseDto,
  type RequestResponseDto,
} from './dto/request-response.dto';
import { RequestsService } from './requests.service';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly answerInteractionsService: AnswerInteractionsService,
  ) {}

  @Post()
  @UseGuards(OptionalSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateRequestDto,
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string,
  ): Promise<RequestResponseDto> {
    const request = await this.requestsService.create(dto, userId, guestId);
    return toRequestResponseDto(request);
  }

  @Get()
  async findAll(): Promise<RequestResponseDto[]> {
    const requests = await this.requestsService.findVisible();
    return requests.map(toRequestResponseDto);
  }

  // /read's feed: every visible request that has at least one visible reply,
  // newest first, with its replies nested (oldest first).
  @Get('feed')
  async feed(): Promise<FeedItemResponseDto[]> {
    const items = await this.requestsService.findFeed();
    return items.map(toFeedItemDto);
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
    return request ? toRequestResponseDto(request) : null;
  }

  // Held requires a session — see docs/decisions/2026-08-22-onseol-answer-
  // queue-decisions.md for why holding is member-only while skip is not.
  @Get('held')
  @UseGuards(SessionGuard)
  async held(@CurrentUser() userId: string): Promise<RequestResponseDto[]> {
    const rows = await this.answerInteractionsService.findHeldForAuthor(userId);
    return rows.map((row) => toRequestResponseDto(row.request));
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
    return next ? toRequestResponseDto(next) : null;
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
    return next ? toRequestResponseDto(next) : null;
  }
}
