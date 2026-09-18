import { createZodDto } from 'nestjs-zod';
import { pushSubscriptionsResponseSchema } from 'shared/dto';

export class PushSubscriptionsResponseDto extends createZodDto(
  pushSubscriptionsResponseSchema,
) {}
