import { createZodDto } from 'nestjs-zod';
import {
  publicProfileSchema,
  publicReplyItemSchema,
  publicRequestItemSchema,
} from 'shared/dto';
import { visibleRequestBody } from '../../common/request-content';
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
    body: visibleRequestBody(request),
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
    requestBody: visibleRequestBody(request),
  };
}

export class PublicProfileDto extends createZodDto(publicProfileSchema) {}
