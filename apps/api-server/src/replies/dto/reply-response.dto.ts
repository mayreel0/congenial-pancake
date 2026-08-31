import { createZodDto } from 'nestjs-zod';
import { replyResponseSchema } from 'shared/dto';
import { toAuthorDisplayDto } from '../../common/author-display';
import type { ReplyRecord } from '../replies.repository';

export class ReplyResponseDto extends createZodDto(replyResponseSchema) {}

// See request-response.dto.ts — same author-display convention, same reason
// `nicknameByUserId` is a required (not defaulted) param.
export function toReplyResponseDto(
  reply: ReplyRecord,
  nicknameByUserId: Map<string, string | null>,
): ReplyResponseDto {
  return {
    id: reply.id,
    requestId: reply.requestId,
    body: reply.body,
    createdAt: reply.createdAt.toISOString(),
    author: toAuthorDisplayDto(reply, nicknameByUserId),
  };
}
