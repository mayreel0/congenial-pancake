import { createInitialPrototypeState } from "./seed-data";
import { PROTOTYPE_STORAGE_KEYS } from "./storage-keys";
import type {
  OnseolReply,
  OnseolRequest,
  OnseolViewer,
  PrototypeState,
  ReplyDrafts,
} from "./types";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The prototype should stay usable even if browser storage is blocked.
  }
}

export function readPrototypeState(): PrototypeState {
  const fallback = createInitialPrototypeState(new Date());
  const requests = readJson<OnseolRequest[]>(PROTOTYPE_STORAGE_KEYS.requests);

  if (!requests || requests.length === 0) {
    writePrototypeState(fallback);
    return fallback;
  }

  const viewer = readJson<OnseolViewer>(PROTOTYPE_STORAGE_KEYS.viewer);
  const replies = readJson<OnseolReply[]>(PROTOTYPE_STORAGE_KEYS.replies);
  const requestDraft = readJson<string>(PROTOTYPE_STORAGE_KEYS.requestDraft);
  const replyDrafts = readJson<ReplyDrafts>(
    PROTOTYPE_STORAGE_KEYS.replyDrafts,
  );
  const selectedRequestId = readJson<string | null>(
    PROTOTYPE_STORAGE_KEYS.selectedRequestId,
  );
  const skippedRequestIds = readJson<string[]>(
    PROTOTYPE_STORAGE_KEYS.skippedRequestIds,
  );
  const heldRequestIds = readJson<string[]>(
    PROTOTYPE_STORAGE_KEYS.heldRequestIds,
  );
  const savedRequestIds = readJson<string[]>(
    PROTOTYPE_STORAGE_KEYS.savedRequestIds,
  );

  return {
    viewer: viewer ?? fallback.viewer,
    requests,
    replies: replies ?? [],
    requestDraft: requestDraft ?? "",
    replyDrafts: replyDrafts ?? {},
    selectedRequestId: selectedRequestId ?? requests[0]?.id ?? null,
    skippedRequestIds: skippedRequestIds ?? [],
    heldRequestIds: heldRequestIds ?? [],
    savedRequestIds: savedRequestIds ?? [],
  };
}

export function writePrototypeState(state: PrototypeState): void {
  writeJson(PROTOTYPE_STORAGE_KEYS.viewer, state.viewer);
  writeJson(PROTOTYPE_STORAGE_KEYS.requests, state.requests);
  writeJson(PROTOTYPE_STORAGE_KEYS.replies, state.replies);
  writeJson(PROTOTYPE_STORAGE_KEYS.requestDraft, state.requestDraft);
  writeJson(PROTOTYPE_STORAGE_KEYS.replyDrafts, state.replyDrafts);
  writeJson(PROTOTYPE_STORAGE_KEYS.selectedRequestId, state.selectedRequestId);
  writeJson(PROTOTYPE_STORAGE_KEYS.skippedRequestIds, state.skippedRequestIds);
  writeJson(PROTOTYPE_STORAGE_KEYS.heldRequestIds, state.heldRequestIds);
  writeJson(PROTOTYPE_STORAGE_KEYS.savedRequestIds, state.savedRequestIds);
}

export function resetPrototypeState(): PrototypeState {
  const state = createInitialPrototypeState(new Date());
  writePrototypeState(state);
  return state;
}
