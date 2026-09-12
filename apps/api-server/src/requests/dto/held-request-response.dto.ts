import { createZodDto } from 'nestjs-zod';
import { heldRequestResponseSchema } from 'shared/dto';
import type { RequestRecord } from '../requests.repository';
import { toRequestResponseDto } from './request-response.dto';

export class HeldRequestResponseDto extends createZodDto(
  heldRequestResponseSchema,
) {}

export function toHeldRequestResponseDto(
  request: RequestRecord & { replyCount?: number },
  expiresAt: Date,
  nicknameByUserId: Map<string, string | null>,
): HeldRequestResponseDto {
  return {
    ...toRequestResponseDto(request, nicknameByUserId),
    expiresAt: expiresAt.toISOString(),
  };
}
