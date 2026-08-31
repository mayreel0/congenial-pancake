import { createZodDto } from 'nestjs-zod';
import { createReplySchema } from 'shared/dto';

export class CreateReplyDto extends createZodDto(createReplySchema) {}
