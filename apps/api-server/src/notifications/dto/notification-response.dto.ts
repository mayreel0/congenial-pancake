import { createZodDto } from 'nestjs-zod';
import { notificationResponseSchema } from 'shared/dto';
import type { NotificationRecord } from '../notifications.repository';

export class NotificationResponseDto extends createZodDto(
  notificationResponseSchema,
) {}

export function toNotificationResponseDto(
  notification: NotificationRecord,
): NotificationResponseDto {
  return {
    id: notification.id,
    type: notification.type,
    requestId: notification.requestId,
    replyId: notification.replyId,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
  };
}
