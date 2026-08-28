import {
  toAuthorDisplayDto,
  type AuthorDisplayDto,
} from '../../common/author-display';
import type { ReplyWithRequest } from '../replies.repository';

export type MyAnswerLogEntryDto = {
  requestId: string;
  requestBody: string;
  requestCreatedAt: Date;
  requestAuthor: AuthorDisplayDto;
  replyId: string;
  replyBody: string;
  replyCreatedAt: Date;
  // The viewer's own reply, shown as it appears to everyone else — lets
  // them confirm whether their reveal choice actually took effect.
  replyAuthor: AuthorDisplayDto;
};

export function toMyAnswerLogEntryDto(
  entry: ReplyWithRequest,
  nicknameByUserId: Map<string, string | null>,
): MyAnswerLogEntryDto {
  return {
    requestId: entry.request.id,
    requestBody: entry.request.body,
    requestCreatedAt: entry.request.createdAt,
    requestAuthor: toAuthorDisplayDto(entry.request, nicknameByUserId),
    replyId: entry.reply.id,
    replyBody: entry.reply.body,
    replyCreatedAt: entry.reply.createdAt,
    replyAuthor: toAuthorDisplayDto(entry.reply, nicknameByUserId),
  };
}
