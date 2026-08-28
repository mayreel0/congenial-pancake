import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GuestId } from '../common/decorators/guest-id.decorator';
import { OptionalCurrentUser } from '../auth/optional-current-user.decorator';
import { OptionalSessionGuard } from '../auth/optional-session.guard';
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

  @Get('mine')
  @UseGuards(OptionalSessionGuard)
  async mine(
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string,
  ): Promise<MyAnswerLogEntryDto[]> {
    const entries = await this.repliesService.findMine(userId, guestId);
    const authorIds = entries.flatMap((entry) => [
      entry.request.authorId,
      entry.reply.authorId,
    ]);
    const nicknameByUserId = await this.usersService.nicknameMapFor(
      authorIds.filter((id): id is string => id !== null),
    );
    return entries.map((entry) =>
      toMyAnswerLogEntryDto(entry, nicknameByUserId),
    );
  }
}
