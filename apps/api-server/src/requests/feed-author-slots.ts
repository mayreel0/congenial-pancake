// authorId/guestId never cross the HTTP boundary (see dto/request-response.dto.ts),
// but /read shows a whole thread at once and needs to visually tell repeat
// authors apart within that one thread — e.g. a guest who replied twice to
// the same request. This assigns each distinct identity in a thread an
// incrementing slot (0, 1, 2, ...) in order of first appearance, which the
// frontend then maps to a randomly-picked display nickname. The slot itself
// carries no identity outside this one thread.
export type AuthorIdentity = {
  authorId: string | null;
  guestId: string | null;
};

export function assignAuthorSlots(
  requestAuthor: AuthorIdentity,
  replyAuthors: AuthorIdentity[],
): { requestAuthorSlot: number; replySlots: number[] } {
  const slotByIdentity = new Map<string, number>();

  function slotFor(identity: AuthorIdentity): number {
    const key = identity.authorId
      ? `u:${identity.authorId}`
      : `g:${identity.guestId}`;
    const existing = slotByIdentity.get(key);
    if (existing !== undefined) return existing;

    const slot = slotByIdentity.size;
    slotByIdentity.set(key, slot);
    return slot;
  }

  const requestAuthorSlot = slotFor(requestAuthor);
  const replySlots = replyAuthors.map(slotFor);

  return { requestAuthorSlot, replySlots };
}
