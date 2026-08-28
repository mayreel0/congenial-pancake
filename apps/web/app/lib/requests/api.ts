import { apiFetch } from "../api";

// Mirrors apps/api-server/src/common/author-display.ts's AuthorDisplayDto.
// A guest post is always { anonymous: true }; a member post is only
// { anonymous: false, ... } when they opted in for that specific post AND
// had a nickname set at the time.
export type AuthorDisplayDto =
  | { anonymous: true }
  | { anonymous: false; nickname: string; nicknameDiscriminator: string };

export type RequestDto = {
  id: string;
  body: string;
  createdAt: string;
  replyCount: number;
  author: AuthorDisplayDto;
};

export function listRequests(): Promise<RequestDto[]> {
  return apiFetch<RequestDto[]>("/requests");
}

// Anonymous writers are identified by a server-issued httpOnly guest_id
// cookie (apps/api's GuestIdMiddleware) sent automatically with every
// request via apiFetch's credentials: "include" — no client-side id to
// manage here anymore.
//
// anonymous defaults to true server-side when omitted, and is ignored
// entirely for guest writers (they can never post non-anonymously) — see
// docs/decisions/2026-08-28-onseol-nickname-post-reveal-decisions.md.
export function createRequest(
  body: string,
  anonymous?: boolean,
): Promise<RequestDto> {
  return apiFetch<RequestDto>("/requests", {
    method: "POST",
    body: JSON.stringify({ body, anonymous }),
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
  author: AuthorDisplayDto;
};

export type FeedItemDto = {
  request: RequestDto & { authorSlot: number };
  replies: FeedReplyDto[];
};

export function fetchFeed(): Promise<FeedItemDto[]> {
  return apiFetch<FeedItemDto[]>("/requests/feed");
}

// "내 기록" → 내가 작성한 고민: mirrors apps/api-server's
// MyRequestLogEntryDto — nested, not flattened like MyAnswerLogEntryDto,
// since a request can have many replies (an answer log entry is always
// exactly one request + one reply).
export type MyRequestLogEntryDto = {
  request: {
    id: string;
    body: string;
    createdAt: string;
    author: AuthorDisplayDto;
  };
  replies: {
    id: string;
    body: string;
    createdAt: string;
    author: AuthorDisplayDto;
  }[];
};

export function fetchMyRequestLog(): Promise<MyRequestLogEntryDto[]> {
  return apiFetch<MyRequestLogEntryDto[]>("/requests/mine");
}
