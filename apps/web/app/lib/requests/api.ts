import { apiFetch } from "../api";
import { getOrCreateGuestId } from "../guest/guestId";

export type RequestDto = {
  id: string;
  body: string;
  createdAt: string;
  replyCount: number;
};

export function listRequests(): Promise<RequestDto[]> {
  return apiFetch<RequestDto[]>("/requests");
}

// The guest id is sent whenever we have one, whether or not the caller is
// actually logged in — the backend only reads it for the anonymous-write
// path (logged-in requests use the session and ignore this header).
export function createRequest(body: string): Promise<RequestDto> {
  return apiFetch<RequestDto>("/requests", {
    method: "POST",
    headers: { "X-Guest-Id": getOrCreateGuestId() },
    body: JSON.stringify({ body }),
  });
}

// Also needs the guest id on GET — the queue excludes the viewer's own/
// already-replied/skipped/held requests, which requires knowing who's asking
// even for a read.
export function fetchQueueCandidate(): Promise<RequestDto | null> {
  return apiFetch<RequestDto | null>("/requests/queue", {
    headers: { "X-Guest-Id": getOrCreateGuestId() },
  });
}

export function skipRequest(requestId: string): Promise<RequestDto | null> {
  return apiFetch<RequestDto | null>(`/requests/${requestId}/skip`, {
    method: "POST",
    headers: { "X-Guest-Id": getOrCreateGuestId() },
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
