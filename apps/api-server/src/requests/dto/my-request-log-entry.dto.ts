import { createZodDto } from 'nestjs-zod';
import { myRequestLogEntrySchema } from 'shared/dto';
import { toAuthorDisplayDto } from '../../common/author-display';
import type { FeedItem } from '../requests.repository';

export class MyRequestLogEntryDto extends createZodDto(
  myRequestLogEntrySchema,
) {}

export function toMyRequestLogEntryDto(
  item: FeedItem,
  nicknameByUserId: Map<string, string | null>,
): MyRequestLogEntryDto {
  return {
    request: {
      id: item.request.id,
      body: item.request.body,
      createdAt: item.request.createdAt.toISOString(),
      author: toAuthorDisplayDto(item.request, nicknameByUserId),
    },
    replies: item.replies.map((reply) => ({
      id: reply.id,
      body: reply.body,
      createdAt: reply.createdAt.toISOString(),
      author: toAuthorDisplayDto(reply, nicknameByUserId),
    })),
  };
}
