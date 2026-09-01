import type {
  LandingStatsResponseDto,
  SampleExchangesResponseDto,
} from "shared/dto";
import { apiFetch } from "../api";

export type LandingStatsDto = LandingStatsResponseDto;
export type SampleExchangesDto = SampleExchangesResponseDto;

export function fetchLandingStats(): Promise<LandingStatsDto> {
  return apiFetch<LandingStatsDto>("/public/stats");
}

export function fetchSampleExchanges(limit: number): Promise<SampleExchangesDto> {
  return apiFetch<SampleExchangesDto>(`/public/samples?limit=${limit}`);
}
