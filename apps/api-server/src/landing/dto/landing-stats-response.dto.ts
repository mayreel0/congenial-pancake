import { createZodDto } from 'nestjs-zod';
import { landingStatsResponseSchema } from 'shared/dto';

export class LandingStatsResponseDto extends createZodDto(
  landingStatsResponseSchema,
) {}
