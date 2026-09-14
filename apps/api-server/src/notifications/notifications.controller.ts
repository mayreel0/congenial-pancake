import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionGuard } from '../auth/session.guard';
import {
  parsePageParam,
  parsePageSizeParam,
  toPaginatedDto,
  type PaginatedDto,
} from '../common/pagination.dto';
import {
  toNotificationResponseDto,
  type NotificationResponseDto,
} from './dto/notification-response.dto';
import { UnreadCountResponseDto } from './dto/unread-count-response.dto';
import { NotificationsService } from './notifications.service';

// Member-only — a guest has no persistent identity to notify later, same
// scope restriction as /requests/mine.
@ApiTags('notifications')
@Controller('notifications')
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findMine(
    @CurrentUser() userId: string,
    @Query('page') pageParam: string | undefined,
    @Query('pageSize') pageSizeParam: string | undefined,
  ): Promise<PaginatedDto<NotificationResponseDto>> {
    const page = parsePageParam(pageParam);
    const pageSize = parsePageSizeParam(pageSizeParam);
    const { items, totalItems } = await this.notificationsService.findMine(
      userId,
      { page, pageSize },
    );
    return toPaginatedDto(
      items.map(toNotificationResponseDto),
      page,
      totalItems,
      pageSize,
    );
  }

  // Polled badge count (see useNotificationStream on the frontend for the
  // real-time half — this endpoint is the fallback that catches anything a
  // missed/never-connected stream would otherwise drop).
  @Get('unread-count')
  @ZodResponse({ type: UnreadCountResponseDto })
  async unreadCount(
    @CurrentUser() userId: string,
  ): Promise<UnreadCountResponseDto> {
    const count = await this.notificationsService.unreadCount(userId);
    return { count };
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@CurrentUser() userId: string): Promise<void> {
    await this.notificationsService.markAllRead(userId);
  }
}
