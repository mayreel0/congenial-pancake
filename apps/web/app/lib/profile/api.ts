import { apiFetch } from "../api";
import type { PaginatedDto } from "../pagination";
import type { FeedItemDto } from "../requests/api";

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
  // Preview only — the most recent few (apps/api-server's
  // PROFILE_PREVIEW_SIZE). The full paginated list is fetched separately
  // via fetchPublicRequests/fetchPublicReplies below.
  requests: PublicRequestItemDto[];
  replies: PublicReplyItemDto[];
};

export type PublicRequestItemDto = {
  id: string;
  body: string;
  createdAt: string;
};

export type PublicReplyItemDto = {
  id: string;
  body: string;
  createdAt: string;
  requestId: string;
  requestBody: string;
};

export function fetchPublicProfile(
  nickname: string,
  discriminator: string,
): Promise<PublicProfileDto> {
  return apiFetch<PublicProfileDto>(
    `/users/${encodeURIComponent(nickname)}/${encodeURIComponent(discriminator)}`,
  );
}

function paginationQuery(page?: number, pageSize?: number): string {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return query ? `?${query}` : "";
}

// "모두 보기" — 남긴 고민 전체.
export function fetchPublicRequests(
  nickname: string,
  discriminator: string,
  page?: number,
  pageSize?: number,
): Promise<PaginatedDto<PublicRequestItemDto>> {
  return apiFetch<PaginatedDto<PublicRequestItemDto>>(
    `/users/${encodeURIComponent(nickname)}/${encodeURIComponent(discriminator)}/requests${paginationQuery(page, pageSize)}`,
  );
}

// "모두 보기" — 남긴 답변 전체.
export function fetchPublicReplies(
  nickname: string,
  discriminator: string,
  page?: number,
  pageSize?: number,
): Promise<PaginatedDto<PublicReplyItemDto>> {
  return apiFetch<PaginatedDto<PublicReplyItemDto>>(
    `/users/${encodeURIComponent(nickname)}/${encodeURIComponent(discriminator)}/replies${paginationQuery(page, pageSize)}`,
  );
}

// 고민 상세 — that request's full public thread. Reuses FeedItemDto (same
// shape /read's feed returns) since the backend reuses the exact same
// response DTO — see apps/api-server/src/profile/profile.controller.ts.
export function fetchPublicRequestThread(
  nickname: string,
  discriminator: string,
  requestId: string,
): Promise<FeedItemDto> {
  return apiFetch<FeedItemDto>(
    `/users/${encodeURIComponent(nickname)}/${encodeURIComponent(discriminator)}/requests/${encodeURIComponent(requestId)}`,
  );
}

// 답변 상세 — same thread shape as fetchPublicRequestThread (the backend
// resolves the reply to its parent request); the caller already knows
// which replyId it navigated from and highlights that one itself.
export function fetchPublicReplyThread(
  nickname: string,
  discriminator: string,
  replyId: string,
): Promise<FeedItemDto> {
  return apiFetch<FeedItemDto>(
    `/users/${encodeURIComponent(nickname)}/${encodeURIComponent(discriminator)}/replies/${encodeURIComponent(replyId)}`,
  );
}
