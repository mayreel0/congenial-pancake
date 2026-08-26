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
import { CreateReplyDto } from './dto/create-reply.dto';
import {
  toReplyResponseDto,
  type ReplyResponseDto,
} from './dto/reply-response.dto';
import { RepliesService } from './replies.service';

@ApiTags('replies')
@Controller('requests/:requestId/replies')
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

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
    return toReplyResponseDto(reply);
  }

  @Get()
  async findAll(
    @Param('requestId') requestId: string,
  ): Promise<ReplyResponseDto[]> {
    const replies = await this.repliesService.findVisibleByRequestId(requestId);
    return replies.map(toReplyResponseDto);
  }
}
