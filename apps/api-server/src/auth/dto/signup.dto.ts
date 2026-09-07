import { createZodDto } from 'nestjs-zod';
import { signupSchema } from 'shared/dto';

// Email only — see AuthService.requestSignup.
export class SignupDto extends createZodDto(signupSchema) {}
