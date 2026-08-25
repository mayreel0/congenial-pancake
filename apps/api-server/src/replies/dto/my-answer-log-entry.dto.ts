import type { ReplyWithRequest } from '../replies.repository';

export type MyAnswerLogEntryDto = {
  requestId: string;
  requestBody: string;
  requestCreatedAt: Date;
  replyId: string;
  replyBody: string;
  replyCreatedAt: Date;
};

export function toMyAnswerLogEntryDto(
  entry: ReplyWithRequest,
): MyAnswerLogEntryDto {
  return {
    requestId: entry.request.id,
    requestBody: entry.request.body,
    requestCreatedAt: entry.request.createdAt,
    replyId: entry.reply.id,
    replyBody: entry.reply.body,
    replyCreatedAt: entry.reply.createdAt,
  };
}
