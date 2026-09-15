import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { PasswordResetService } from '../auth/password-reset/password-reset.service';
import { SessionGuard } from '../auth/session.guard';
import { UsersService } from '../users/users.service';
import type { AdminContentStatus, ReplyModerationActionDto } from 'shared/dto';
import { replyModerationActionSchema } from 'shared/dto';
import { isValidDateString, kstDateRange } from '../common/kst-date';
import {
  parsePageParam,
  parsePageSizeParam,
  toPaginatedDto,
  type PaginatedDto,
} from '../common/pagination.dto';
import { ReportsService } from '../reports/reports.service';
import { RepliesService } from '../replies/replies.service';
import { RequestsService } from '../requests/requests.service';
import type { AdminContentStatusFilter } from '../requests/requests.repository';
import { SettingsService } from '../settings/settings.service';
import { UpdateSettingsDto } from '../settings/dto/update-settings.dto';
import {
  SettingsResponseDto,
  toSettingsResponseDto,
} from '../settings/dto/settings.dto';
import { AdminGuard } from './admin.guard';
import {
  toAdminReplyListItemDto,
  type AdminReplyListItemDto,
} from './dto/admin-reply-list-item.dto';
import {
  toAdminRequestListItemDto,
  type AdminRequestListItemDto,
} from './dto/admin-request-list-item.dto';
import {
  toAdminReplyResponseDto,
  type AdminReplyResponseDto,
} from './dto/admin-reply.dto';
import {
  toAdminRequestResponseDto,
  type AdminRequestResponseDto,
} from './dto/admin-request.dto';
import { IssuePasswordResetLinkDto } from './dto/issue-password-reset-link.dto';

const ADMIN_CONTENT_STATUS_VALUES: AdminContentStatus[] = [
  'visible',
  'hidden',
  'deleted',
];
function parseStatusFilter(
  status: string | undefined,
): AdminContentStatusFilter | undefined {
  return ADMIN_CONTENT_STATUS_VALUES.includes(status as AdminContentStatus)
    ? (status as AdminContentStatusFilter)
    : undefined;
}

const REPLY_MODERATION_ACTION_VALUES = replyModerationActionSchema.options;
function parseActionFilter(
  action: string | undefined,
): ReplyModerationActionDto | undefined {
  return REPLY_MODERATION_ACTION_VALUES.includes(
    action as ReplyModerationActionDto,
  )
    ? (action as ReplyModerationActionDto)
    : undefined;
}

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
    private readonly usersService: UsersService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  // Cheap precheck for apps/admin's /accounts page, which (unlike 신고 검토
  // and 설정) has no other GET endpoint of its own to probe "is this
  // session actually an admin" ahead of a real mutation attempt — reaching
  // this handler at all already proves it (SessionGuard + AdminGuard on the
  // whole controller), so the response body carries no real information.
  @Get('whoami')
  whoami(): { isAdmin: true } {
    return { isAdmin: true };
  }

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

  // "고민 관리" — every request regardless of report/hidden status, unlike
  // moderation/hidden above which is only the auto-hidden queue. Same
  // restore/delete endpoints below work on rows found here too.
  @Get('requests')
  async listRequests(
    @Query('q') q: string | undefined,
    @Query('from') fromParam: string | undefined,
    @Query('to') toParam: string | undefined,
    @Query('status') statusParam: string | undefined,
    @Query('page') pageParam: string | undefined,
    @Query('pageSize') pageSizeParam: string | undefined,
  ): Promise<PaginatedDto<AdminRequestListItemDto>> {
    const from =
      fromParam && isValidDateString(fromParam) ? fromParam : undefined;
    const to = toParam && isValidDateString(toParam) ? toParam : undefined;
    const page = parsePageParam(pageParam);
    const pageSize = parsePageSizeParam(pageSizeParam);

    const { items, totalItems } = await this.requestsService.findAllForAdmin(
      {
        q: q?.trim() || undefined,
        range: kstDateRange(from, to),
        status: parseStatusFilter(statusParam),
      },
      { page, pageSize },
    );

    const dtoItems = await this.enrichWithReportCount(
      items,
      'request',
      (item) => item.id,
      toAdminRequestListItemDto,
    );

    return toPaginatedDto(dtoItems, page, totalItems, pageSize);
  }

  // "답변 관리" — every reply regardless of report/hidden status, with its
  // AI 사전검토(dry-run) 판정을 같이 반환. Same restore/delete endpoints below
  // work on rows found here too.
  @Get('replies')
  async listReplies(
    @Query('q') q: string | undefined,
    @Query('from') fromParam: string | undefined,
    @Query('to') toParam: string | undefined,
    @Query('status') statusParam: string | undefined,
    @Query('action') actionParam: string | undefined,
    @Query('page') pageParam: string | undefined,
    @Query('pageSize') pageSizeParam: string | undefined,
  ): Promise<PaginatedDto<AdminReplyListItemDto>> {
    const from =
      fromParam && isValidDateString(fromParam) ? fromParam : undefined;
    const to = toParam && isValidDateString(toParam) ? toParam : undefined;
    const page = parsePageParam(pageParam);
    const pageSize = parsePageSizeParam(pageSizeParam);

    const { items, totalItems } = await this.repliesService.findAllForAdmin(
      {
        q: q?.trim() || undefined,
        range: kstDateRange(from, to),
        status: parseStatusFilter(statusParam),
        action: parseActionFilter(actionParam),
      },
      { page, pageSize },
    );

    const dtoItems = await this.enrichWithReportCount(
      items,
      'reply',
      (item) => item.reply.id,
      toAdminReplyListItemDto,
    );

    return toPaginatedDto(dtoItems, page, totalItems, pageSize);
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
  @ZodResponse({ type: SettingsResponseDto })
  async getSettings(): Promise<SettingsResponseDto> {
    const settings = await this.settingsService.get();
    return toSettingsResponseDto(settings);
  }

  @Patch('settings')
  @ZodResponse({ type: SettingsResponseDto })
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    const settings = await this.settingsService.update(dto);
    return toSettingsResponseDto(settings);
  }

  // One-off way to give an OAuth-only account (no password_hash) a password
  // — e.g. so it can log into apps/admin standalone, which has no OAuth
  // login of its own. Returns the link directly instead of emailing it:
  // there's no email-sending infra in this project, and the admin using
  // this is the same person who'd be receiving the email anyway.
  @Post('users/password-reset-link')
  async issuePasswordResetLink(
    @Body() dto: IssuePasswordResetLinkDto,
  ): Promise<{ url: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new NotFoundException();
    const url = await this.passwordResetService.issueLink(user.id);
    return { url };
  }
}
