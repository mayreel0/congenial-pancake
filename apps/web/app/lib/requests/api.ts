import { apiFetch } from "../api";

export type RequestDto = {
  id: string;
  body: string;
  createdAt: string;
  replyCount: number;
};

export function listRequests(): Promise<RequestDto[]> {
  return apiFetch<RequestDto[]>("/requests");
}

// Anonymous writers are identified by a server-issued httpOnly guest_id
// cookie (apps/api's GuestIdMiddleware) sent automatically with every
// request via apiFetch's credentials: "include" — no client-side id to
// manage here anymore.
export function createRequest(body: string): Promise<RequestDto> {
  return apiFetch<RequestDto>("/requests", {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function fetchQueueCandidate(): Promise<RequestDto | null> {
  return apiFetch<RequestDto | null>("/requests/queue");
}

export function skipRequest(requestId: string): Promise<RequestDto | null> {
  return apiFetch<RequestDto | null>(`/requests/${requestId}/skip`, {
    method: "POST",
  });
}

// Holding requires a session (see docs/decisions/2026-08-22-onseol-answer-
// queue-decisions.md) — no guest id to send here.
export function holdRequest(requestId: string): Promise<RequestDto | null> {
  return apiFetch<RequestDto | null>(`/requests/${requestId}/hold`, {
    method: "POST",
  });
}

export function fetchHeldRequests(): Promise<RequestDto[]> {
  return apiFetch<RequestDto[]>("/requests/held");
}

// authorSlot identifies a repeat author only within this one thread — see
// apps/api/src/requests/feed-author-slots.ts. It carries no identity beyond
// that; the frontend maps it to a randomly-picked display nickname.
export type FeedReplyDto = {
  id: string;
  requestId: string;
  body: string;
  createdAt: string;
  authorSlot: number;
};

export type FeedItemDto = {
  request: RequestDto & { authorSlot: number };
  replies: FeedReplyDto[];
};

export function fetchFeed(): Promise<FeedItemDto[]> {
  return apiFetch<FeedItemDto[]>("/requests/feed");
}
