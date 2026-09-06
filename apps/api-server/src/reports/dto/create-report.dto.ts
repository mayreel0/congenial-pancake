import { createZodDto } from 'nestjs-zod';
import { createReportSchema } from 'shared/dto';

export class CreateReportDto extends createZodDto(createReportSchema) {}
