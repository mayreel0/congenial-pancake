import {
  toAuthorDisplayDto,
  type AuthorDisplayDto,
} from '../../common/author-display';
import type { FeedItem } from '../requests.repository';

export type MyRequestLogEntryDto = {
  request: {
    id: string;
    body: string;
    createdAt: Date;
    // The viewer's own request, shown as it appears to everyone else — lets
    // them confirm whether their reveal choice actually took effect.
    author: AuthorDisplayDto;
  };
  replies: {
    id: string;
    body: string;
    createdAt: Date;
    author: AuthorDisplayDto;
  }[];
};

export function toMyRequestLogEntryDto(
  item: FeedItem,
  nicknameByUserId: Map<string, string | null>,
): MyRequestLogEntryDto {
  return {
    request: {
      id: item.request.id,
      body: item.request.body,
      createdAt: item.request.createdAt,
      author: toAuthorDisplayDto(item.request, nicknameByUserId),
    },
    replies: item.replies.map((reply) => ({
      id: reply.id,
      body: reply.body,
      createdAt: reply.createdAt,
      author: toAuthorDisplayDto(reply, nicknameByUserId),
    })),
  };
}
