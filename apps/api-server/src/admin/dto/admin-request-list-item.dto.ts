import { createZodDto } from 'nestjs-zod';
import {
  adminRequestListItemSchema,
  type AdminContentStatus,
} from 'shared/dto';
import type { RequestWithReplyCount } from '../../requests/requests.repository';

export class AdminRequestListItemDto extends createZodDto(
  adminRequestListItemSchema,
) {}

function adminContentStatus(
  hidden: boolean,
  deletedAt: Date | null,
): AdminContentStatus {
  if (deletedAt) return 'deleted';
  if (hidden) return 'hidden';
  return 'visible';
}

// authorId/guestId still never cross the HTTP boundary — see
// adminRequestResponseSchema's comment for why.
export function toAdminRequestListItemDto(
  request: RequestWithReplyCount,
  reportCount: number,
): AdminRequestListItemDto {
  return {
    id: request.id,
    body: request.body,
    createdAt: request.createdAt.toISOString(),
    status: adminContentStatus(request.hidden, request.deletedAt),
    replyCount: request.replyCount,
    reportCount,
  };
}
