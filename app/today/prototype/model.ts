import type { OnseolReply, OnseolRequest, PrototypeState } from "./types";

export function isToday(isoDate: string, now: Date): boolean {
  const value = new Date(isoDate);

  return (
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate()
  );
}

export function getVisibleRequests(state: PrototypeState): OnseolRequest[] {
  return state.requests.filter((request) => !request.hidden);
}

export function getVisibleRepliesForRequest(
  state: PrototypeState,
  requestId: string,
): OnseolReply[] {
  return state.replies
    .filter((reply) => reply.requestId === requestId && !reply.hidden)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPriorityRequests(
  state: PrototypeState,
  now: Date,
): OnseolRequest[] {
  return getVisibleRequests(state).sort((a, b) => {
    const todayScore =
      Number(isToday(b.createdAt, now)) - Number(isToday(a.createdAt, now));
    if (todayScore !== 0) return todayScore;

    const aReplies = getVisibleRepliesForRequest(state, a.id).length;
    const bReplies = getVisibleRepliesForRequest(state, b.id).length;
    if (aReplies !== bReplies) return aReplies - bReplies;

    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function getRecentExchanges(
  state: PrototypeState,
): Array<{ request: OnseolRequest; reply: OnseolReply | null }> {
  return getVisibleRequests(state)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
    .map((request) => ({
      request,
      reply: getVisibleRepliesForRequest(state, request.id)[0] ?? null,
    }));
}

export function getRecentNonViewerRequests(
  state: PrototypeState,
  limit = 5,
): OnseolRequest[] {
  return getVisibleRequests(state)
    .filter((request) => request.authorId !== state.viewer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getTodayEntryMessages(
  state: PrototypeState,
  fallbackMessages: string[],
  limit = 5,
): string[] {
  const recentMessages = getRecentNonViewerRequests(state, limit).map(
    (request) => request.body,
  );

  return recentMessages.length > 0 ? recentMessages : fallbackMessages;
}

export function getMyRequests(state: PrototypeState): OnseolRequest[] {
  return getVisibleRequests(state)
    .filter((request) => request.authorId === state.viewer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMyReplies(state: PrototypeState): OnseolReply[] {
  return state.replies
    .filter((reply) => reply.authorId === state.viewer.id && !reply.hidden)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function hasViewerReplied(
  state: PrototypeState,
  requestId: string,
): boolean {
  return state.replies.some(
    (reply) =>
      reply.requestId === requestId && reply.authorId === state.viewer.id,
  );
}

export function truncatePreview(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
