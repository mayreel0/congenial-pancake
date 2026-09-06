import type {
  DayCountsResponseDto,
  MyAnswerLogEntryDto as SharedMyAnswerLogEntryDto,
  ReplyResponseDto,
} from "shared/dto";
import { apiFetch } from "../api";
import type { PaginatedDto } from "../pagination";

export type ReplyDto = ReplyResponseDto;

// anonymous defaults to true server-side when omitted, ignored entirely for
// guest writers — see requests/api.ts's createRequest for the same rule.
export function createReply(
  requestId: string,
  body: string,
  anonymous?: boolean,
): Promise<ReplyDto> {
  return apiFetch<ReplyDto>(`/requests/${requestId}/replies`, {
    method: "POST",
    body: JSON.stringify({ body, anonymous }),
  });
}

export type MyAnswerLogEntryDto = SharedMyAnswerLogEntryDto;

// from/to both omitted → unbounded (the full history) — see
// apps/api-server's kstDateRange.
export function fetchMyAnswerLog(
  from?: string,
  to?: string,
  page?: number,
  pageSize?: number,
): Promise<PaginatedDto<MyAnswerLogEntryDto>> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return apiFetch<PaginatedDto<MyAnswerLogEntryDto>>(
    `/replies/mine${query ? `?${query}` : ""}`,
  );
}

// Save ("마음에 남기기") requires a session — no guest id to send, matching
// hold/report.
export function saveReply(replyId: string): Promise<void> {
  return apiFetch<void>(`/replies/${replyId}/save`, { method: "POST" });
}

export function unsaveReply(replyId: string): Promise<void> {
  return apiFetch<void>(`/replies/${replyId}/save`, { method: "DELETE" });
}

export function fetchSavedReplyIds(): Promise<string[]> {
  return apiFetch<string[]>("/replies/saved");
}

// HeatmapCalendar day counts — see requests/api.ts's fetchFeedDayCounts.
export type DayCountsDto = DayCountsResponseDto;

export function fetchMyReplyDayCounts(
  from: string,
  to: string,
): Promise<DayCountsDto> {
  const params = new URLSearchParams({ from, to });
  return apiFetch<DayCountsDto>(`/replies/mine/counts?${params.toString()}`);
}
