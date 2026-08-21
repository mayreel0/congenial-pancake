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
import { AnswerInteractionsService } from '../answer-interactions/answer-interactions.service';
import { GuestId } from '../common/decorators/guest-id.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalCurrentUser } from '../auth/optional-current-user.decorator';
import { OptionalSessionGuard } from '../auth/optional-session.guard';
import { SessionGuard } from '../auth/session.guard';
import { CreateRequestDto } from './dto/create-request.dto';
import {
  toRequestResponseDto,
  type RequestResponseDto,
} from './dto/request-response.dto';
import { RequestsService } from './requests.service';

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
    @GuestId() guestId: string | undefined,
  ): Promise<RequestResponseDto> {
    const request = await this.requestsService.create(dto, userId, guestId);
    return toRequestResponseDto(request);
  }

  @Get()
  async findAll(): Promise<RequestResponseDto[]> {
    const requests = await this.requestsService.findVisible();
    return requests.map(toRequestResponseDto);
  }

  // The single next request this viewer should answer — see
  // RequestsRepository.findQueueCandidate for the ranking rules.
  @Get('queue')
  @UseGuards(OptionalSessionGuard)
  async queue(
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string | undefined,
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

  @Post(':id/skip')
  @UseGuards(OptionalSessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async skip(
    @Param('id') id: string,
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string | undefined,
  ): Promise<void> {
    await this.answerInteractionsService.skip(id, userId, guestId);
  }

  @Post(':id/hold')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async hold(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.answerInteractionsService.hold(id, userId);
  }
}
