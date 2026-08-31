"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchPublicProfile,
  fetchPublicReplies,
  fetchPublicReplyThread,
  fetchPublicRequestThread,
  fetchPublicRequests,
} from "./api";

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

// "모두 보기" — 남긴 고민. keepPreviousData so switching pages doesn't flash
// a loading state, matching /records' list queries.
export function usePublicRequestsQuery(
  nickname: string | null,
  discriminator: string | null,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ["profile", nickname, discriminator, "requests", page, pageSize],
    retry: false,
    queryFn: () =>
      fetchPublicRequests(nickname!, discriminator!, page, pageSize),
    enabled: nickname !== null && discriminator !== null,
    placeholderData: keepPreviousData,
  });
}

// "모두 보기" — 남긴 답변.
export function usePublicRepliesQuery(
  nickname: string | null,
  discriminator: string | null,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ["profile", nickname, discriminator, "replies", page, pageSize],
    retry: false,
    queryFn: () =>
      fetchPublicReplies(nickname!, discriminator!, page, pageSize),
    enabled: nickname !== null && discriminator !== null,
    placeholderData: keepPreviousData,
  });
}

// 고민 상세.
export function usePublicRequestThreadQuery(
  nickname: string | null,
  discriminator: string | null,
  requestId: string | null,
) {
  return useQuery({
    queryKey: ["profile", nickname, discriminator, "requestThread", requestId],
    retry: false,
    queryFn: () =>
      fetchPublicRequestThread(nickname!, discriminator!, requestId!),
    enabled: nickname !== null && discriminator !== null && requestId !== null,
  });
}

// 답변 상세.
export function usePublicReplyThreadQuery(
  nickname: string | null,
  discriminator: string | null,
  replyId: string | null,
) {
  return useQuery({
    queryKey: ["profile", nickname, discriminator, "replyThread", replyId],
    retry: false,
    queryFn: () => fetchPublicReplyThread(nickname!, discriminator!, replyId!),
    enabled: nickname !== null && discriminator !== null && replyId !== null,
  });
}
