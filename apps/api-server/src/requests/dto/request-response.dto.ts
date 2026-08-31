import { createZodDto } from 'nestjs-zod';
import { requestResponseSchema } from 'shared/dto';
import { toAuthorDisplayDto } from '../../common/author-display';
import type { RequestRecord } from '../requests.repository';

export class RequestResponseDto extends createZodDto(requestResponseSchema) {}

// authorId/guestId themselves never cross the HTTP boundary — only the
// derived `author` field does (see common/author-display.ts), which stays
// { anonymous: true } unless the author opted in for this specific post.
// replyCount defaults to 0 for a just-created request, which never has any
// replies yet; the list endpoint passes the real count from the repository.
//
// `nicknameByUserId` is a required param (not defaulted) on purpose: every
// call site must be updated to pass a real map, so a forgotten call site
// fails typecheck instead of silently rendering nicknames as anonymous.
export function toRequestResponseDto(
  request: RequestRecord & { replyCount?: number },
  nicknameByUserId: Map<string, string | null>,
): RequestResponseDto {
  return {
    id: request.id,
    body: request.body,
    createdAt: request.createdAt.toISOString(),
    replyCount: request.replyCount ?? 0,
    author: toAuthorDisplayDto(request, nicknameByUserId),
  };
}
