import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SessionGuard } from '../auth/session.guard';
import { ReportsService } from '../reports/reports.service';
import { RepliesService } from '../replies/replies.service';
import { RequestsService } from '../requests/requests.service';
import { SettingsService } from '../settings/settings.service';
import { UpdateSettingsDto } from '../settings/dto/update-settings.dto';
import {
  toSettingsResponseDto,
  type SettingsResponseDto,
} from '../settings/dto/settings.dto';
import { AdminGuard } from './admin.guard';
import {
  toAdminReplyResponseDto,
  type AdminReplyResponseDto,
} from './dto/admin-reply.dto';
import {
  toAdminRequestResponseDto,
  type AdminRequestResponseDto,
} from './dto/admin-request.dto';

export type HiddenModerationQueueDto = {
  requests: AdminRequestResponseDto[];
  replies: AdminReplyResponseDto[];
};

// 신고 검토 — the only /admin section in this MVP scope, see
// docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md.
// SessionGuard first (so request.userId is set), then AdminGuard (checks
// that userId against the whitelist) — order matters.
@ApiTags('admin')
@Controller('admin')
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly repliesService: RepliesService,
    private readonly reportsService: ReportsService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('moderation/hidden')
  async hidden(): Promise<HiddenModerationQueueDto> {
    const [hiddenRequests, hiddenReplies] = await Promise.all([
      this.requestsService.findHidden(),
      this.repliesService.findHidden(),
    ]);

    const requests = await this.enrichWithReportCount(
      hiddenRequests,
      'request',
      (request) => request.id,
      toAdminRequestResponseDto,
    );

    const replies = await this.enrichWithReportCount(
      hiddenReplies,
      'reply',
      (entry) => entry.reply.id,
      toAdminReplyResponseDto,
    );

    return { requests, replies };
  }

  private enrichWithReportCount<T, D>(
    items: T[],
    targetType: 'request' | 'reply',
    idOf: (item: T) => string,
    toDto: (item: T, reportCount: number) => D,
  ): Promise<D[]> {
    return Promise.all(
      items.map(async (item) => {
        const reportCount = await this.reportsService.countDistinctReporters(
          targetType,
          idOf(item),
        );
        return toDto(item, reportCount);
      }),
    );
  }

  @Post('requests/:id/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  async restoreRequest(@Param('id') id: string): Promise<void> {
    await this.requestsService.restore(id);
  }

  @Post('requests/:id/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRequest(@Param('id') id: string): Promise<void> {
    await this.requestsService.softDelete(id);
  }

  @Post('replies/:id/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  async restoreReply(@Param('id') id: string): Promise<void> {
    await this.repliesService.restore(id);
  }

  @Post('replies/:id/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReply(@Param('id') id: string): Promise<void> {
    await this.repliesService.softDelete(id);
  }

  @Get('settings')
  async getSettings(): Promise<SettingsResponseDto> {
    const settings = await this.settingsService.get();
    return toSettingsResponseDto(settings);
  }

  @Patch('settings')
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    const settings = await this.settingsService.update(dto);
    return toSettingsResponseDto(settings);
  }
}
