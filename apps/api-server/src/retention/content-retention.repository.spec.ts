import type { Database } from '../database/database.types';
import { ContentRetentionRepository } from './content-retention.repository';

// Each update().set().where().returning() chain resolves to the next queued
// result; the moderation-log update has no .returning().
function makeDb(results: {
  requests: { id: string }[];
  replies: { id: string }[];
}) {
  const calls: { table: unknown; set: unknown }[] = [];
  const queue = [results.requests, results.replies];
  const tx = {
    update: jest.fn((table: unknown) => ({
      set: (set: unknown) => {
        calls.push({ table, set });
        return {
          where: () => {
            const chain = Promise.resolve(undefined) as Promise<undefined> & {
              returning: () => Promise<{ id: string }[]>;
            };
            chain.returning = () => Promise.resolve(queue.shift() ?? []);
            return chain;
          },
        };
      },
    })),
  };
  const db = {
    transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  } as unknown as Database;
  return { db, calls, tx };
}

describe('ContentRetentionRepository', () => {
  it('blanks removed requests and replies and clears the moderation suggestions derived from the replies', async () => {
    const { db, calls } = makeDb({
      requests: [{ id: 'req-1' }],
      replies: [{ id: 'rep-1' }, { id: 'rep-2' }],
    });

    const result = await new ContentRetentionRepository(db).purgeRemovedContent(
      new Date('2026-08-23T05:00:00.000Z'),
    );

    expect(result).toEqual({ requests: 1, replies: 2 });
    expect(calls.map((c) => c.set)).toEqual([
      { body: '' },
      { body: '' },
      { suggestions: [] },
    ]);
  });

  it('leaves the moderation logs alone when no reply was purged', async () => {
    const { db, calls } = makeDb({ requests: [{ id: 'req-1' }], replies: [] });

    const result = await new ContentRetentionRepository(db).purgeRemovedContent(
      new Date('2026-08-23T05:00:00.000Z'),
    );

    expect(result).toEqual({ requests: 1, replies: 0 });
    expect(calls.map((c) => c.set)).toEqual([{ body: '' }, { body: '' }]);
  });
});
