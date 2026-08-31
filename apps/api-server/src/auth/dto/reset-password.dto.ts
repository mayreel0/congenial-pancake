import { createZodDto } from 'nestjs-zod';
import { resetPasswordSchema } from 'shared/dto';

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
