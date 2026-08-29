import { apiFetch } from "../api";

// Mirrors apps/api-server's PublicProfileDto (src/profile/dto/public-profile.dto.ts).
export type PublicProfileDto = {
  nickname: string;
  nicknameDiscriminator: string;
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
