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
