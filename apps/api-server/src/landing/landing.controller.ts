import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { LandingService } from './landing.service';
import { LandingStatsResponseDto } from './dto/landing-stats-response.dto';
import type { SampleExchangesResponseDto } from './dto/sample-exchanges-response.dto';

// Public, no auth — landing page copy for logged-out visitors.
@ApiTags('public')
@Controller('public')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Get('stats')
  @ZodResponse({ type: LandingStatsResponseDto })
  getStats(): Promise<LandingStatsResponseDto> {
    return this.landingService.getStats();
  }

  // No @ZodResponse — composite/array response, same convention as
  // /admin/moderation/hidden (see apps/api-server/AGENTS.md "DTOs vs
  // domain models"): type shared via `import type`, no runtime
  // double-validation layer.
  @Get('samples')
  getSamples(
    @Query('limit') limit?: string,
  ): Promise<SampleExchangesResponseDto> {
    const parsed = limit === undefined ? undefined : Number(limit);
    return this.landingService.getSamples(parsed);
  }
}
