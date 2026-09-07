import { createZodDto } from 'nestjs-zod';
import { completeSignupSchema } from 'shared/dto';

export class CompleteSignupDto extends createZodDto(completeSignupSchema) {}
