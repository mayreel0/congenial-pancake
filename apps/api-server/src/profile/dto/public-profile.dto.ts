import { createZodDto } from 'nestjs-zod';
import {
  publicProfileSchema,
  publicReplyItemSchema,
  publicRequestItemSchema,
} from 'shared/dto';
import type { ReplyWithRequest } from '../../replies/replies.repository';
import type { RequestRecord } from '../../requests/requests.repository';

export class PublicRequestItemDto extends createZodDto(
  publicRequestItemSchema,
) {}

export function toPublicRequestItemDto(
  request: RequestRecord,
): PublicRequestItemDto {
  return {
    id: request.id,
    body: request.body,
    createdAt: request.createdAt.toISOString(),
  };
}

export class PublicReplyItemDto extends createZodDto(publicReplyItemSchema) {}

export function toPublicReplyItemDto({
  reply,
  request,
}: ReplyWithRequest): PublicReplyItemDto {
  return {
    id: reply.id,
    body: reply.body,
    createdAt: reply.createdAt.toISOString(),
    requestId: request.id,
    requestBody: request.body,
  };
}

export class PublicProfileDto extends createZodDto(publicProfileSchema) {}
