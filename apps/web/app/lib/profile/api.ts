import { apiFetch } from "../api";

// Mirrors apps/api-server's PublicProfileDto (src/profile/dto/public-profile.dto.ts).
export type PublicProfileDto = {
  nickname: string;
  nicknameDiscriminator: string;
  // Each independently toggleable from /me — a hidden list is an empty
  // array (not an error), and *Count is non-null only when the count
  // switch is on, regardless of whether the corresponding list is shown.
  requestsVisible: boolean;
  repliesVisible: boolean;
  countsVisible: boolean;
  requestCount: number | null;
  replyCount: number | null;
  requests: {
    id: string;
    body: string;
    createdAt: string;
  }[];
  replies: {
    id: string;
    body: string;
    createdAt: string;
    requestId: string;
    requestBody: string;
  }[];
};

export function fetchPublicProfile(
  nickname: string,
  discriminator: string,
): Promise<PublicProfileDto> {
  return apiFetch<PublicProfileDto>(
    `/users/${encodeURIComponent(nickname)}/${encodeURIComponent(discriminator)}`,
  );
}
