import { Controller, Get, UseGuards } from '@nestjs/common';
import { GuestId } from '../common/decorators/guest-id.decorator';
import { OptionalCurrentUser } from '../auth/optional-current-user.decorator';
import { OptionalSessionGuard } from '../auth/optional-session.guard';
import {
  toMyAnswerLogEntryDto,
  type MyAnswerLogEntryDto,
} from './dto/my-answer-log-entry.dto';
import { RepliesService } from './replies.service';

// Separate from RepliesController because that one is nested under
// requests/:requestId/replies — this route is top-level (/replies/mine),
// not scoped to one request.
@Controller('replies')
export class RepliesMineController {
  constructor(private readonly repliesService: RepliesService) {}

  @Get('mine')
  @UseGuards(OptionalSessionGuard)
  async mine(
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string,
  ): Promise<MyAnswerLogEntryDto[]> {
    const entries = await this.repliesService.findMine(userId, guestId);
    return entries.map(toMyAnswerLogEntryDto);
  }
}
