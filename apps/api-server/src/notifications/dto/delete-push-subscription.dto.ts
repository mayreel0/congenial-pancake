import { createZodDto } from 'nestjs-zod';
import { deletePushSubscriptionSchema } from 'shared/dto';

export class DeletePushSubscriptionDto extends createZodDto(
  deletePushSubscriptionSchema,
) {}
