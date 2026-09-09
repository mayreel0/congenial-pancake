import { createZodDto } from 'nestjs-zod';
import { myRequestLogEntrySchema } from 'shared/dto';
import { toAuthorDisplayDto } from '../../common/author-display';
import {
  visibleReplyBody,
  visibleRequestBody,
} from '../../common/request-content';
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
      body: visibleRequestBody(item.request),
      createdAt: item.request.createdAt.toISOString(),
      author: toAuthorDisplayDto(item.request, nicknameByUserId),
      removed: item.request.contentRemoved,
    },
    replies: item.replies.map((reply) => ({
      id: reply.id,
      body: visibleReplyBody(reply),
      createdAt: reply.createdAt.toISOString(),
      author: toAuthorDisplayDto(reply, nicknameByUserId),
      removed: reply.deletedAt !== null,
    })),
  };
}
