import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  type MessageEvent,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
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

  // Real-time half — see unread-count's comment for the polling half this
  // pairs with. Deliberately just a "something changed" ping (the id, not
  // the full response DTO) — the stream's raw NotificationRecord isn't
  // joined with its request body the way findMine's list is, and the
  // frontend already refetches the list/count on any signal rather than
  // rendering this payload directly, so there's no reason to duplicate
  // that join here. One open HTTP connection per viewer; SessionGuard
  // already covers this route the same as every other one on this
  // controller (the frontend's EventSource must be opened with
  // withCredentials so the session cookie rides along, since it's a
  // cross-origin connection in production).
  @Sse('stream')
  stream(@CurrentUser() userId: string): Observable<MessageEvent> {
    return this.notificationsService
      .stream(userId)
      .pipe(map((notification) => ({ data: { id: notification.id } })));
  }
}
