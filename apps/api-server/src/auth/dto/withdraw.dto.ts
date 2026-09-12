import { createZodDto } from 'nestjs-zod';
import { withdrawSchema } from 'shared/dto';

export class WithdrawDto extends createZodDto(withdrawSchema) {}
