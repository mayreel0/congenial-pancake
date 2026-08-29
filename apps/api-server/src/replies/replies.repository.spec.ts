jest.mock('drizzle-orm', () => ({
  and: jest.fn((...args: unknown[]) => ({ op: 'and', args })),
  asc: jest.fn((arg: unknown) => ({ op: 'asc', arg })),
  desc: jest.fn((arg: unknown) => ({ op: 'desc', arg })),
  eq: jest.fn((left: unknown, right: unknown) => ({ op: 'eq', left, right })),
  isNull: jest.fn((arg: unknown) => ({ op: 'isNull', arg })),
}));

import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Database } from '../database/database.types';
import { replies, requests } from '../database/schema';
import { RepliesRepository } from './replies.repository';

describe('RepliesRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findPublicByAuthor', () => {
    it('only fetches revealed replies on visible requests, newest-first', async () => {
      const orderBy = jest.fn().mockResolvedValue([]);
      const where = jest.fn(() => ({ orderBy }));
      const innerJoin = jest.fn(() => ({ where }));
      const from = jest.fn(() => ({ innerJoin }));
      const select = jest.fn(() => ({ from }));
      const db = { select } as unknown as Database;
      const repository = new RepliesRepository(db);

      await repository.findPublicByAuthor('user-1');

      expect(select).toHaveBeenCalledWith({
        reply: replies,
        request: requests,
      });
      expect(innerJoin).toHaveBeenCalledWith(
        requests,
        eq(requests.id, replies.requestId),
      );
      expect(where).toHaveBeenCalledWith(
        and(
          eq(replies.authorId, 'user-1'),
          eq(replies.anonymous, false),
          eq(replies.hidden, false),
          isNull(replies.deletedAt),
          eq(requests.hidden, false),
          isNull(requests.deletedAt),
        ),
      );
      expect(orderBy).toHaveBeenCalledWith(desc(replies.createdAt));
    });
  });
});
