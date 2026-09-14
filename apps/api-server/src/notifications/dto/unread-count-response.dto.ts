import { createZodDto } from 'nestjs-zod';
import { unreadCountResponseSchema } from 'shared/dto';

export class UnreadCountResponseDto extends createZodDto(
  unreadCountResponseSchema,
) {}
