import { createZodDto } from 'nestjs-zod';
import { signupSchema } from 'shared/dto';

export class SignupDto extends createZodDto(signupSchema) {}
