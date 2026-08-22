import { assignAuthorSlots } from './feed-author-slots';

describe('assignAuthorSlots', () => {
  it('gives the request author slot 0 and each new reply author the next slot', () => {
    const result = assignAuthorSlots({ authorId: 'author-1', guestId: null }, [
      { authorId: 'author-2', guestId: null },
      { authorId: 'author-3', guestId: null },
    ]);

    expect(result.requestAuthorSlot).toBe(0);
    expect(result.replySlots).toEqual([1, 2]);
  });

  it('reuses the same slot for the same identity appearing more than once', () => {
    const result = assignAuthorSlots({ authorId: null, guestId: 'guest-1' }, [
      { authorId: null, guestId: 'guest-2' },
      { authorId: null, guestId: 'guest-1' },
      { authorId: null, guestId: 'guest-2' },
    ]);

    expect(result.requestAuthorSlot).toBe(0);
    expect(result.replySlots).toEqual([1, 0, 1]);
  });

  it('treats a member and a guest with the same underlying id as different identities', () => {
    const result = assignAuthorSlots({ authorId: 'shared-id', guestId: null }, [
      { authorId: null, guestId: 'shared-id' },
    ]);

    expect(result.requestAuthorSlot).toBe(0);
    expect(result.replySlots).toEqual([1]);
  });
});
