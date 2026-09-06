import { createZodDto } from 'nestjs-zod';
import { loginSchema } from 'shared/dto';

export class LoginDto extends createZodDto(loginSchema) {}
