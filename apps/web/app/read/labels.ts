import type { FeedItemDto } from "../lib/requests/api";

// The API never exposes authorId/guestId (see apps/api/src/requests/dto/
// request-response.dto.ts) — a thread only gets a per-thread authorSlot
// (apps/api/src/requests/feed-author-slots.ts) telling us "this is the same
// author as slot N within this thread," nothing more. We map each slot to a
// nickname drawn from a fixed pool, offset by a hash of the thread's request
// id so different threads don't all start from the same nickname.
const NICKNAME_POOL = [
  "조용한 파도",
  "포근한 밤",
  "따뜻한 구름",
  "잔잔한 바람",
  "작은 불빛",
  "느린 강물",
  "고요한 숲",
  "은은한 노을",
  "말없는 별",
  "부드러운 눈",
  "가벼운 발걸음",
  "낮은 목소리",
  "다정한 그림자",
  "차분한 새벽",
  "말간 하늘",
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function buildFeedItemLabels(item: FeedItemDto): Map<number, string> {
  const offset = hashSeed(item.request.id) % NICKNAME_POOL.length;
  const labels = new Map<number, string>();

  function labelFor(slot: number): string {
    return NICKNAME_POOL[(offset + slot) % NICKNAME_POOL.length];
  }

  labels.set(item.request.authorSlot, labelFor(item.request.authorSlot));
  for (const reply of item.replies) {
    labels.set(reply.authorSlot, labelFor(reply.authorSlot));
  }

  return labels;
}
