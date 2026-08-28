import {
  toAuthorDisplayDto,
  type AuthorDisplayDto,
} from '../../common/author-display';
import type { ReplyRecord } from '../replies.repository';

export type ReplyResponseDto = {
  id: string;
  requestId: string;
  body: string;
  createdAt: Date;
  author: AuthorDisplayDto;
};

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
    createdAt: reply.createdAt,
    author: toAuthorDisplayDto(reply, nicknameByUserId),
  };
}
