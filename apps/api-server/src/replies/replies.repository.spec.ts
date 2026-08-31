jest.mock('drizzle-orm', () => ({
  and: jest.fn((...args: unknown[]) => ({ op: 'and', args })),
  asc: jest.fn((arg: unknown) => ({ op: 'asc', arg })),
  count: jest.fn((arg?: unknown) => ({ op: 'count', arg })),
  desc: jest.fn((arg: unknown) => ({ op: 'desc', arg })),
  eq: jest.fn((left: unknown, right: unknown) => ({ op: 'eq', left, right })),
  gte: jest.fn((left: unknown, right: unknown) => ({ op: 'gte', left, right })),
  isNull: jest.fn((arg: unknown) => ({ op: 'isNull', arg })),
  lt: jest.fn((left: unknown, right: unknown) => ({ op: 'lt', left, right })),
}));

import { and, desc, eq, gte, isNull, lt } from 'drizzle-orm';
import type { Database } from '../database/database.types';
import { replies, requests } from '../database/schema';
import { RepliesRepository } from './replies.repository';

describe('RepliesRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findPublicByAuthor', () => {
    // Two sequential db.select() calls: a joined count, then the paginated,
    // joined rows themselves — mirrors findMine's pattern below, plus the
    // innerJoin every step needs since visibility depends on both the reply
    // and its parent request.
    function makeCountChain(totalItems: number) {
      const where = jest.fn().mockResolvedValue([{ value: totalItems }]);
      const innerJoin = jest.fn(() => ({ where }));
      const from = jest.fn(() => ({ innerJoin }));
      return { from, innerJoin, where };
    }

    function makeRowsChain(rows: unknown[]) {
      const offset = jest.fn().mockResolvedValue(rows);
      const limit = jest.fn(() => ({ offset }));
      const orderBy = jest.fn(() => ({ limit }));
      const where = jest.fn(() => ({ orderBy }));
      const innerJoin = jest.fn(() => ({ where }));
      const from = jest.fn(() => ({ innerJoin }));
      return { from, innerJoin, where, orderBy, limit, offset };
    }

    const expectedWhere = and(
      eq(replies.authorId, 'user-1'),
      eq(replies.anonymous, false),
      eq(replies.hidden, false),
      isNull(replies.deletedAt),
      eq(requests.hidden, false),
      isNull(requests.deletedAt),
    );

    it('paginates revealed replies on visible requests, newest-first, with the true total', async () => {
      const rows = [{ reply: { id: 'reply-1' }, request: { id: 'request-1' } }];
      const countChain = makeCountChain(1);
      const rowsChain = makeRowsChain(rows);
      const select = jest
        .fn()
        .mockReturnValueOnce({ from: countChain.from })
        .mockReturnValueOnce({ from: rowsChain.from });
      const db = { select } as unknown as Database;
      const repository = new RepliesRepository(db);

      const result = await repository.findPublicByAuthor('user-1', {
        page: 1,
        pageSize: 20,
      });

      expect(countChain.where).toHaveBeenCalledWith(expectedWhere);
      expect(rowsChain.innerJoin).toHaveBeenCalledWith(
        requests,
        eq(requests.id, replies.requestId),
      );
      expect(rowsChain.where).toHaveBeenCalledWith(expectedWhere);
      expect(rowsChain.orderBy).toHaveBeenCalledWith(desc(replies.createdAt));
      expect(rowsChain.limit).toHaveBeenCalledWith(20);
      expect(rowsChain.offset).toHaveBeenCalledWith(0);
      expect(result).toEqual({ items: rows, totalItems: 1 });
    });

    it('skips the row query when the author has nothing revealed', async () => {
      const countChain = makeCountChain(0);
      const select = jest.fn().mockReturnValueOnce({ from: countChain.from });
      const db = { select } as unknown as Database;
      const repository = new RepliesRepository(db);

      const result = await repository.findPublicByAuthor('user-1', {
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({ items: [], totalItems: 0 });
      expect(select).toHaveBeenCalledTimes(1);
    });
  });

  describe('findMine', () => {
    // Two sequential db.select() calls: a plain count, then the paginated,
    // joined rows themselves — mirrors RequestsRepository.findMine.spec's
    // pattern for the same shape of query.
    function makeCountChain(totalItems: number) {
      const where = jest.fn().mockResolvedValue([{ value: totalItems }]);
      const from = jest.fn(() => ({ where }));
      return { from, where };
    }

    function makeRowsChain(rows: unknown[]) {
      const offset = jest.fn().mockResolvedValue(rows);
      const limit = jest.fn(() => ({ offset }));
      const orderBy = jest.fn(() => ({ limit }));
      const where = jest.fn(() => ({ orderBy }));
      const innerJoin = jest.fn(() => ({ where }));
      const from = jest.fn(() => ({ innerJoin }));
      return { from, innerJoin, where, orderBy, limit, offset };
    }

    it('paginates the viewer’s own replies newest-first, unfiltered by date when no range is given', async () => {
      const rows = [{ reply: { id: 'reply-1' }, request: { id: 'request-1' } }];
      const countChain = makeCountChain(1);
      const rowsChain = makeRowsChain(rows);
      const select = jest
        .fn()
        .mockReturnValueOnce({ from: countChain.from })
        .mockReturnValueOnce({ from: rowsChain.from });
      const db = { select } as unknown as Database;
      const repository = new RepliesRepository(db);

      const result = await repository.findMine(
        { authorId: 'user-1' },
        {},
        { page: 2, pageSize: 10 },
      );

      expect(rowsChain.where).toHaveBeenCalledWith(
        and(eq(replies.authorId, 'user-1'), undefined),
      );
      expect(rowsChain.orderBy).toHaveBeenCalledWith(desc(replies.createdAt));
      expect(rowsChain.limit).toHaveBeenCalledWith(10);
      expect(rowsChain.offset).toHaveBeenCalledWith(10);
      expect(result).toEqual({ items: rows, totalItems: 1 });
    });

    it('applies a date range when both from and to are given', async () => {
      const start = new Date('2026-08-01T00:00:00.000Z');
      const end = new Date('2026-08-31T00:00:00.000Z');
      const countChain = makeCountChain(0);
      const select = jest.fn().mockReturnValueOnce({ from: countChain.from });
      const db = { select } as unknown as Database;
      const repository = new RepliesRepository(db);

      const result = await repository.findMine(
        { guestId: 'guest-1' },
        { start, end },
        { page: 1, pageSize: 20 },
      );

      expect(countChain.where).toHaveBeenCalledWith(
        and(
          eq(replies.guestId, 'guest-1'),
          and(gte(replies.createdAt, start), lt(replies.createdAt, end)),
        ),
      );
      expect(result).toEqual({ items: [], totalItems: 0 });
    });
  });
});
