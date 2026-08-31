import { createZodDto } from 'nestjs-zod';
import { createRequestSchema } from 'shared/dto';

export class CreateRequestDto extends createZodDto(createRequestSchema) {}
