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
import { GuestId } from '../common/decorators/guest-id.decorator';
import { OptionalCurrentUser } from '../auth/optional-current-user.decorator';
import { OptionalSessionGuard } from '../auth/optional-session.guard';
import { UsersService } from '../users/users.service';
import { CreateReplyDto } from './dto/create-reply.dto';
import {
  toReplyResponseDto,
  type ReplyResponseDto,
} from './dto/reply-response.dto';
import type { ReplyRecord } from './replies.repository';
import { RepliesService } from './replies.service';

@ApiTags('replies')
@Controller('requests/:requestId/replies')
export class RepliesController {
  constructor(
    private readonly repliesService: RepliesService,
    private readonly usersService: UsersService,
  ) {}

  private nicknameMapFor(
    records: Pick<ReplyRecord, 'authorId'>[],
  ): Promise<Map<string, string | null>> {
    const authorIds = records
      .map((record) => record.authorId)
      .filter((id): id is string => id !== null);
    return this.usersService.nicknameMapFor(authorIds);
  }

  @Post()
  @UseGuards(OptionalSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('requestId') requestId: string,
    @Body() dto: CreateReplyDto,
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string,
  ): Promise<ReplyResponseDto> {
    const reply = await this.repliesService.create(
      requestId,
      dto,
      userId,
      guestId,
    );
    const nicknameByUserId = await this.nicknameMapFor([reply]);
    return toReplyResponseDto(reply, nicknameByUserId);
  }

  @Get()
  async findAll(
    @Param('requestId') requestId: string,
  ): Promise<ReplyResponseDto[]> {
    const replies = await this.repliesService.findVisibleByRequestId(requestId);
    const nicknameByUserId = await this.nicknameMapFor(replies);
    return replies.map((reply) => toReplyResponseDto(reply, nicknameByUserId));
  }
}
