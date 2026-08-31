import { createZodDto } from 'nestjs-zod';
import { adminReplyResponseSchema } from 'shared/dto';
import type { ReplyWithRequest } from '../../replies/replies.repository';

export class AdminReplyResponseDto extends createZodDto(
  adminReplyResponseSchema,
) {}

// Includes the parent request's body for context (what was this reply to?)
// — still never authorId/guestId, same anonymity rule as everywhere else.
export function toAdminReplyResponseDto(
  { reply, request }: ReplyWithRequest,
  reportCount: number,
): AdminReplyResponseDto {
  return {
    id: reply.id,
    requestId: reply.requestId,
    requestBody: request.body,
    body: reply.body,
    createdAt: reply.createdAt.toISOString(),
    reportCount,
  };
}
