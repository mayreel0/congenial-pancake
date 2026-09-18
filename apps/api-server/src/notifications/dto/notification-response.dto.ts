import { createZodDto } from 'nestjs-zod';
import { notificationResponseSchema } from 'shared/dto';
import { visibleRequestBody } from '../../common/request-content';
import type { NotificationWithRequest } from '../notifications.repository';

export class NotificationResponseDto extends createZodDto(
  notificationResponseSchema,
) {}

export function toNotificationResponseDto(
  notification: NotificationWithRequest,
): NotificationResponseDto {
  return {
    id: notification.id,
    type: notification.type,
    requestId: notification.requestId,
    replyId: notification.replyId,
    requestBody:
      notification.requestBody !== null
        ? visibleRequestBody({
            body: notification.requestBody,
            contentRemoved: notification.requestContentRemoved ?? false,
          })
        : null,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
  };
}
