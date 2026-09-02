"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLandingStats, fetchSampleExchanges } from "./api";

export const landingKeys = {
  stats: ["landing", "stats"] as const,
  samples: (limit: number) => ["landing", "samples", limit] as const,
};

// Public marketing copy — a failed fetch shouldn't break the landing page,
// so callers should treat isError as "hide this section", not show an
// error state.
export function useLandingStatsQuery() {
  return useQuery({
    queryKey: landingKeys.stats,
    queryFn: fetchLandingStats,
    retry: false,
  });
}

export function useSampleExchangesQuery(limit: number) {
  return useQuery({
    queryKey: landingKeys.samples(limit),
    queryFn: () => fetchSampleExchanges(limit),
    retry: false,
  });
}
