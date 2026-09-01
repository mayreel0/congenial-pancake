import { createZodDto } from 'nestjs-zod';
import { sampleExchangesResponseSchema } from 'shared/dto';

export class SampleExchangesResponseDto extends createZodDto(
  sampleExchangesResponseSchema,
) {}
