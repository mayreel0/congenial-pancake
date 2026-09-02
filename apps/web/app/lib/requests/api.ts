import type {
  AuthorDisplayDto,
  DayCountsResponseDto,
  FeedItemResponseDto,
  FeedReplyResponseDto,
  MyRequestLogEntryDto as SharedMyRequestLogEntryDto,
  RequestResponseDto,
} from "shared/dto";
import { apiFetch } from "../api";
import type { PaginatedDto } from "../pagination";

export type { AuthorDisplayDto };

export type RequestDto = RequestResponseDto;

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
export type FeedReplyDto = FeedReplyResponseDto;

export type FeedItemDto = FeedItemResponseDto;

export type FeedResponseDto = PaginatedDto<FeedItemDto> & { date: string };

// date omitted lets the backend default to yesterday (KST) — see
// apps/api-server's common/kst-date.ts. `date` always comes back in the
// response so the caller knows which day actually rendered, whether or not
// one was passed in. pageSize omitted lets the backend default to 10; only
// 10/20/50 are accepted server-side, anything else falls back to that
// default.
export function fetchFeed(
  date?: string,
  page?: number,
  pageSize?: number,
): Promise<FeedResponseDto> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return apiFetch<FeedResponseDto>(`/requests/feed${query ? `?${query}` : ""}`);
}

// "내 기록" → 내가 작성한 고민: mirrors apps/api-server's
// MyRequestLogEntryDto — nested, not flattened like MyAnswerLogEntryDto,
// since a request can have many replies (an answer log entry is always
// exactly one request + one reply).
export type MyRequestLogEntryDto = SharedMyRequestLogEntryDto;

// from/to both omitted → unbounded (the full history) — see
// apps/api-server's kstDateRange.
export function fetchMyRequestLog(
  from?: string,
  to?: string,
  page?: number,
  pageSize?: number,
): Promise<PaginatedDto<MyRequestLogEntryDto>> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return apiFetch<PaginatedDto<MyRequestLogEntryDto>>(
    `/requests/mine${query ? `?${query}` : ""}`,
  );
}

// HeatmapCalendar day counts — from/to are always given (the visible month's
// bounds), unlike fetchFeed/fetchMyRequestLog's optional range.
export type DayCountsDto = DayCountsResponseDto;

export function fetchFeedDayCounts(
  from: string,
  to: string,
): Promise<DayCountsDto> {
  const params = new URLSearchParams({ from, to });
  return apiFetch<DayCountsDto>(`/requests/feed/counts?${params.toString()}`);
}

export function fetchMyRequestDayCounts(
  from: string,
  to: string,
): Promise<DayCountsDto> {
  const params = new URLSearchParams({ from, to });
  return apiFetch<DayCountsDto>(`/requests/mine/counts?${params.toString()}`);
}
