import { createZodDto } from 'nestjs-zod';
import { sendTestPushSchema } from 'shared/dto';

export class SendTestPushDto extends createZodDto(sendTestPushSchema) {}
