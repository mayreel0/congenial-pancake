"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPublicProfile } from "./api";

// nickname/discriminator are null until the [slug] route param has been
// parsed — enabled: false until then, matching useHeldRequestsQuery's
// pattern for a query that shouldn't fire yet.
export function usePublicProfileQuery(
  nickname: string | null,
  discriminator: string | null,
) {
  return useQuery({
    queryKey: ["profile", nickname, discriminator],
    // A 404 (no such profile) isn't worth retrying — same reasoning as any
    // other "this resource doesn't exist" lookup.
    retry: false,
    queryFn: () => fetchPublicProfile(nickname!, discriminator!),
    enabled: nickname !== null && discriminator !== null,
  });
}
