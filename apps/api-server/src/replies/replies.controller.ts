import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { GuestId } from '../common/decorators/guest-id.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalCurrentUser } from '../auth/optional-current-user.decorator';
import { OptionalSessionGuard } from '../auth/optional-session.guard';
import { SessionGuard } from '../auth/session.guard';
import { UsersService } from '../users/users.service';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ReplyResponseDto, toReplyResponseDto } from './dto/reply-response.dto';
import type { ReplyRecord } from './replies.repository';
import { RepliesService } from './replies.service';

@ApiTags('replies')
@Controller('requests/:requestId/replies')
export class RepliesController {
  constructor(
    private readonly repliesService: RepliesService,
    private readonly usersService: UsersService,
  ) {}

  // app.module.ts의 ThrottlerModule skipIf와 같은 이중 게이트(운영에서는
  // 절대 안 켜짐, 토큰을 직접 설정해야만 동작) — moderation dry-run 학습
  // 데이터에 부하테스트 트래픽이 섞이지 않게 표시만 해준다. LOAD_TEST_BYPASS_TOKEN은
  // env.schema에 없는 값이라(app.module.ts와 동일하게) process.env를 직접 읽는다.
  private isLoadTestRequest(request: Request): boolean {
    if (process.env.NODE_ENV === 'production') return false;
    const token = process.env.LOAD_TEST_BYPASS_TOKEN;
    if (!token) return false;
    return request.headers['x-load-test-bypass'] === token;
  }

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
  @ZodResponse({ status: HttpStatus.CREATED, type: ReplyResponseDto })
  async create(
    @Param('requestId') requestId: string,
    @Body() dto: CreateReplyDto,
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string,
    @Req() request: Request,
  ): Promise<ReplyResponseDto> {
    const reply = await this.repliesService.create(
      requestId,
      dto,
      userId,
      guestId,
      this.isLoadTestRequest(request),
    );
    const nicknameByUserId = await this.nicknameMapFor([reply]);
    return toReplyResponseDto(reply, nicknameByUserId);
  }

  @Get()
  @ZodResponse({ type: [ReplyResponseDto] })
  async findAll(
    @Param('requestId') requestId: string,
  ): Promise<ReplyResponseDto[]> {
    const replies = await this.repliesService.findVisibleByRequestId(requestId);
    const nicknameByUserId = await this.nicknameMapFor(replies);
    return replies.map((reply) => toReplyResponseDto(reply, nicknameByUserId));
  }

  // Member-only — see RepliesService.deleteOwn.
  @Post(':id/delete-own')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOwn(
    @Param('requestId') requestId: string,
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.repliesService.deleteOwn(userId, requestId, id);
  }
}
