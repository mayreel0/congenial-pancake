import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionGuard } from '../auth/session.guard';
import { SavedRepliesService } from './saved-replies.service';

// Save ("마음에 남기기") is member-only, unlike requests/replies/skip — see
// docs/decisions/2026-08-22-onseol-answer-queue-decisions.md.
@Controller('replies')
@UseGuards(SessionGuard)
export class SavedRepliesController {
  constructor(private readonly savedRepliesService: SavedRepliesService) {}

  @Post(':id/save')
  @HttpCode(HttpStatus.NO_CONTENT)
  async save(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.savedRepliesService.save(id, userId);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsave(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.savedRepliesService.unsave(id, userId);
  }

  @Get('saved')
  async saved(@CurrentUser() userId: string): Promise<string[]> {
    return this.savedRepliesService.findSavedReplyIds(userId);
  }
}
