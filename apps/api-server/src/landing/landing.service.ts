import { Injectable } from '@nestjs/common';
import {
  kstMonthToDateRange,
  todayKstDateString,
  kstDayRange,
} from '../common/kst-date';
import { LandingRepository } from './landing.repository';
import type { LandingStatsResponseDto } from './dto/landing-stats-response.dto';
import type { SampleExchangesResponseDto } from './dto/sample-exchanges-response.dto';

const MAX_SAMPLE_LIMIT = 10;
const DEFAULT_SAMPLE_LIMIT = 6;

@Injectable()
export class LandingService {
  constructor(private readonly landingRepository: LandingRepository) {}

  async getStats(): Promise<LandingStatsResponseDto> {
    const now = new Date();
    const { start: monthStart } = kstMonthToDateRange(now);
    const { start: todayStart } = kstDayRange(todayKstDateString(now));
    const boundaries = { todayStart, monthStart };

    const [requestCounts, replyCounts, waitingForReply] = await Promise.all([
      this.landingRepository.countRequests(boundaries),
      this.landingRepository.countReplies(boundaries),
      this.landingRepository.countWaitingForReply(),
    ]);

    return { requests: requestCounts, replies: replyCounts, waitingForReply };
  }

  async getSamples(limit?: number): Promise<SampleExchangesResponseDto> {
    const clamped = clampLimit(limit);
    const rows = await this.landingRepository.findSampleExchanges(clamped);
    return {
      samples: rows.map((row) => ({
        request: {
          body: row.request.body,
          createdAt: row.request.createdAt.toISOString(),
        },
        reply: {
          body: row.reply.body,
          createdAt: row.reply.createdAt.toISOString(),
        },
      })),
    };
  }
}

function clampLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value))
    return DEFAULT_SAMPLE_LIMIT;
  return Math.min(Math.max(Math.trunc(value), 1), MAX_SAMPLE_LIMIT);
}
