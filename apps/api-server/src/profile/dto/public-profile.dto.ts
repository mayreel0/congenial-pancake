import type { ReplyWithRequest } from '../../replies/replies.repository';
import type { RequestRecord } from '../../requests/requests.repository';

export type PublicRequestItemDto = {
  id: string;
  body: string;
  createdAt: Date;
};

export function toPublicRequestItemDto(
  request: RequestRecord,
): PublicRequestItemDto {
  return {
    id: request.id,
    body: request.body,
    createdAt: request.createdAt,
  };
}

export type PublicReplyItemDto = {
  id: string;
  body: string;
  createdAt: Date;
  requestId: string;
  requestBody: string;
};

export function toPublicReplyItemDto({
  reply,
  request,
}: ReplyWithRequest): PublicReplyItemDto {
  return {
    id: reply.id,
    body: reply.body,
    createdAt: reply.createdAt,
    requestId: request.id,
    requestBody: request.body,
  };
}

export type PublicProfileDto = {
  nickname: string;
  nicknameDiscriminator: string;
  // Each independently toggleable (users.show*OnProfile) — a hidden list
  // is an empty array, not an error; requestCount/replyCount are non-null
  // only when the count switch is on, regardless of whether the
  // corresponding list itself is shown.
  requestsVisible: boolean;
  repliesVisible: boolean;
  countsVisible: boolean;
  requestCount: number | null;
  replyCount: number | null;
  // Preview only — the most recent PROFILE_PREVIEW_SIZE (see
  // profile.service.ts). The full paginated list lives at
  // GET /users/:nickname/:discriminator/requests|replies.
  requests: PublicRequestItemDto[];
  replies: PublicReplyItemDto[];
};
