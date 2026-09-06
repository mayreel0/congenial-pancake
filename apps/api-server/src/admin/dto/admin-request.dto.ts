import { createZodDto } from 'nestjs-zod';
import { adminRequestResponseSchema } from 'shared/dto';
import type { RequestRecord } from '../../requests/requests.repository';

export class AdminRequestResponseDto extends createZodDto(
  adminRequestResponseSchema,
) {}

// authorId/guestId still never cross the HTTP boundary — even admin doesn't
// need to know who wrote it, just whether to restore or delete it.
export function toAdminRequestResponseDto(
  request: RequestRecord,
  reportCount: number,
): AdminRequestResponseDto {
  return {
    id: request.id,
    body: request.body,
    createdAt: request.createdAt.toISOString(),
    reportCount,
  };
}
