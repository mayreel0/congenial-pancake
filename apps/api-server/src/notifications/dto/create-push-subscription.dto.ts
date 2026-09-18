import { createZodDto } from 'nestjs-zod';
import { createPushSubscriptionSchema } from 'shared/dto';

export class CreatePushSubscriptionDto extends createZodDto(
  createPushSubscriptionSchema,
) {}
