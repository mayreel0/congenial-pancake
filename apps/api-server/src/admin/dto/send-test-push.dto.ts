import { createZodDto } from 'nestjs-zod';
import { sendTestPushResponseSchema, sendTestPushSchema } from 'shared/dto';

export class SendTestPushDto extends createZodDto(sendTestPushSchema) {}

export class SendTestPushResponseDto extends createZodDto(
  sendTestPushResponseSchema,
) {}
