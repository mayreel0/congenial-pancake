import type { AuthorDisplayDto } from "../requests/api";
import { apiFetch } from "../api";
import type { PaginatedDto } from "../pagination";

export type ReplyDto = {
  id: string;
  requestId: string;
  body: string;
  createdAt: string;
  author: AuthorDisplayDto;
};

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

export type MyAnswerLogEntryDto = {
  requestId: string;
  requestBody: string;
  requestCreatedAt: string;
  requestAuthor: AuthorDisplayDto;
  replyId: string;
  replyBody: string;
  replyCreatedAt: string;
  replyAuthor: AuthorDisplayDto;
};

// from/to both omitted → unbounded (the full history) — see
// apps/api-server's kstDateRange.
export function fetchMyAnswerLog(
  from?: string,
  to?: string,
  page?: number,
): Promise<PaginatedDto<MyAnswerLogEntryDto>> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (page) params.set("page", String(page));
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
