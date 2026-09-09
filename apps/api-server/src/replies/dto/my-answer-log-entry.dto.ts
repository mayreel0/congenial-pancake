import { createZodDto } from 'nestjs-zod';
import { myAnswerLogEntrySchema } from 'shared/dto';
import { toAuthorDisplayDto } from '../../common/author-display';
import {
  visibleReplyBody,
  visibleRequestBody,
} from '../../common/request-content';
import type { ReplyWithRequest } from '../replies.repository';

export class MyAnswerLogEntryDto extends createZodDto(myAnswerLogEntrySchema) {}

export function toMyAnswerLogEntryDto(
  entry: ReplyWithRequest,
  nicknameByUserId: Map<string, string | null>,
): MyAnswerLogEntryDto {
  return {
    requestId: entry.request.id,
    requestBody: visibleRequestBody(entry.request),
    requestCreatedAt: entry.request.createdAt.toISOString(),
    requestAuthor: toAuthorDisplayDto(entry.request, nicknameByUserId),
    requestRemoved: entry.request.contentRemoved,
    replyId: entry.reply.id,
    replyBody: visibleReplyBody(entry.reply),
    replyCreatedAt: entry.reply.createdAt.toISOString(),
    // The viewer's own reply, shown as it appears to everyone else — lets
    // them confirm whether their reveal choice actually took effect.
    replyAuthor: toAuthorDisplayDto(entry.reply, nicknameByUserId),
    replyRemoved: entry.reply.deletedAt !== null,
  };
}
