import type { ReplyRecord } from '../replies.repository';

export type ReplyResponseDto = {
  id: string;
  requestId: string;
  body: string;
  createdAt: Date;
};

// authorId/guestId never cross the HTTP boundary — same "익명" convention as requests.
export function toReplyResponseDto(reply: ReplyRecord): ReplyResponseDto {
  return {
    id: reply.id,
    requestId: reply.requestId,
    body: reply.body,
    createdAt: reply.createdAt,
  };
}
