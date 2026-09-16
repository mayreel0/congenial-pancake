import { createZodDto } from 'nestjs-zod';
import {
  adminReplyListItemSchema,
  type AdminContentStatus,
  type AdminReplyModerationDto,
} from 'shared/dto';
import type { ReplyWithRequestAndModeration } from '../../replies/replies.repository';

export class AdminReplyListItemDto extends createZodDto(
  adminReplyListItemSchema,
) {}

// Same tri-state derivation as admin-request-list-item.dto.ts's
// adminContentStatus — kept as its own tiny copy rather than a shared
// import, since requests/replies status columns aren't otherwise coupled.
function adminContentStatus(
  hidden: boolean,
  deletedAt: Date | null,
): AdminContentStatus {
  if (deletedAt) return 'deleted';
  if (hidden) return 'hidden';
  return 'visible';
}

function toModerationDto(
  moderation: ReplyWithRequestAndModeration['moderation'],
): AdminReplyModerationDto | null {
  if (!moderation) return null;
  return {
    action: moderation.action,
    categories: moderation.categories,
    severity: moderation.severity,
    confidence: moderation.confidence,
    reason: moderation.reason,
    suggestions: moderation.suggestions,
    createdAt: moderation.createdAt.toISOString(),
  };
}

// authorId/guestId still never cross the HTTP boundary — see
// adminReplyResponseSchema's comment for why.
export function toAdminReplyListItemDto(
  { reply, request, moderation }: ReplyWithRequestAndModeration,
  reportCount: number,
): AdminReplyListItemDto {
  return {
    id: reply.id,
    requestId: reply.requestId,
    requestBody: request.body,
    body: reply.body,
    createdAt: reply.createdAt.toISOString(),
    status: adminContentStatus(reply.hidden, reply.deletedAt),
    reportCount,
    moderation: toModerationDto(moderation),
  };
}
