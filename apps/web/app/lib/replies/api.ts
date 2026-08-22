import { apiFetch } from "../api";
import { getOrCreateGuestId } from "../guest/guestId";

export type ReplyDto = {
  id: string;
  requestId: string;
  body: string;
  createdAt: string;
};

export function createReply(requestId: string, body: string): Promise<ReplyDto> {
  return apiFetch<ReplyDto>(`/requests/${requestId}/replies`, {
    method: "POST",
    headers: { "X-Guest-Id": getOrCreateGuestId() },
    body: JSON.stringify({ body }),
  });
}

export type MyAnswerLogEntryDto = {
  requestId: string;
  requestBody: string;
  requestCreatedAt: string;
  replyId: string;
  replyBody: string;
  replyCreatedAt: string;
};

export function fetchMyAnswerLog(): Promise<MyAnswerLogEntryDto[]> {
  return apiFetch<MyAnswerLogEntryDto[]>("/replies/mine", {
    headers: { "X-Guest-Id": getOrCreateGuestId() },
  });
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
