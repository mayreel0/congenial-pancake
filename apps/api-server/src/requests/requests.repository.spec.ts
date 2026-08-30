jest.mock('drizzle-orm', () => ({
  and: jest.fn((...args: unknown[]) => ({ op: 'and', args })),
  asc: jest.fn((arg: unknown) => ({ op: 'asc', arg })),
  count: jest.fn((arg?: unknown) => ({ op: 'count', arg })),
  countDistinct: jest.fn((arg: unknown) => ({ op: 'countDistinct', arg })),
  desc: jest.fn((arg: unknown) => ({ op: 'desc', arg })),
  eq: jest.fn((left: unknown, right: unknown) => ({ op: 'eq', left, right })),
  gt: jest.fn((left: unknown, right: unknown) => ({ op: 'gt', left, right })),
  gte: jest.fn((left: unknown, right: unknown) => ({ op: 'gte', left, right })),
  inArray: jest.fn((left: unknown, right: unknown) => ({
    op: 'inArray',
    left,
    right,
  })),
  isNull: jest.fn((arg: unknown) => ({ op: 'isNull', arg })),
  lt: jest.fn((left: unknown, right: unknown) => ({ op: 'lt', left, right })),
  ne: jest.fn((left: unknown, right: unknown) => ({ op: 'ne', left, right })),
  notInArray: jest.fn((left: unknown, right: unknown) => ({
    op: 'notInArray',
    left,
    right,
  })),
  or: jest.fn((...args: unknown[]) => ({ op: 'or', args })),
}));

import { and, asc, desc, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import type { Database } from '../database/database.types';
import { replies, requests } from '../database/schema';
import {
  RequestsRepository,
  type ReplyRecord,
  type RequestRecord,
} from './requests.repository';

function makeRequest(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: 'request-1',
    body: '오늘 조금 힘들었어요.',
    authorId: 'user-1',
    guestId: null,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    hidden: false,
    deletedAt: null,
    reviewedAt: null,
    anonymous: true,
    ...overrides,
  };
}

function makeReply(overrides: Partial<ReplyRecord> = {}): ReplyRecord {
  return {
    id: 'reply-1',
    requestId: 'request-1',
    body: '괜찮아요.',
    authorId: 'user-2',
    guestId: null,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    hidden: false,
    deletedAt: null,
    reviewedAt: null,
    anonymous: true,
    ...overrides,
  };
}

describe('RequestsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findMine', () => {
    // Two sequential db.select() calls: a plain count, then the paginated
    // rows themselves (.orderBy().limit().offset()) — each gets its own
    // small chain mock rather than one shared one, since their shapes
    // differ.
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
      const from = jest.fn(() => ({ where }));
      return { from, where, orderBy, limit, offset };
    }

    it('returns the author’s requests newest-first with every nested reply oldest-first', async () => {
      const requestRows = [
        makeRequest({ id: 'request-2' }),
        makeRequest({ id: 'request-1' }),
      ];
      const replyRows = [
        makeReply({ id: 'reply-1', requestId: 'request-1', hidden: true }),
        makeReply({
          id: 'reply-2',
          requestId: 'request-2',
          deletedAt: new Date('2026-08-22T00:00:00.000Z'),
        }),
      ];
      const countChain = makeCountChain(2);
      const rowsChain = makeRowsChain(requestRows);
      const select = jest
        .fn()
        .mockReturnValueOnce({ from: countChain.from })
        .mockReturnValueOnce({ from: rowsChain.from });
      const findMany = jest.fn().mockResolvedValue(replyRows);
      const db = {
        select,
        query: { replies: { findMany } },
      } as unknown as Database;
      const repository = new RequestsRepository(db);

      const result = await repository.findMine(
        'user-1',
        {},
        { page: 1, pageSize: 20 },
      );

      expect(rowsChain.where).toHaveBeenCalledWith(
        and(eq(requests.authorId, 'user-1'), undefined),
      );
      expect(rowsChain.orderBy).toHaveBeenCalledWith(desc(requests.createdAt));
      expect(rowsChain.limit).toHaveBeenCalledWith(20);
      expect(rowsChain.offset).toHaveBeenCalledWith(0);
      expect(findMany).toHaveBeenCalledWith({
        where: inArray(replies.requestId, ['request-2', 'request-1']),
        orderBy: asc(replies.createdAt),
      });
      expect(result).toEqual({
        items: [
          { request: requestRows[0], replies: [replyRows[1]] },
          { request: requestRows[1], replies: [replyRows[0]] },
        ],
        totalItems: 2,
      });
    });

    it('does not fetch replies when the author has no requests', async () => {
      const countChain = makeCountChain(0);
      const select = jest.fn().mockReturnValueOnce({ from: countChain.from });
      const findMany = jest.fn();
      const db = {
        select,
        query: { replies: { findMany } },
      } as unknown as Database;
      const repository = new RequestsRepository(db);

      const result = await repository.findMine(
        'user-1',
        {},
        { page: 1, pageSize: 20 },
      );

      expect(result).toEqual({ items: [], totalItems: 0 });
      expect(findMany).not.toHaveBeenCalled();
    });
  });

  describe('findFeed', () => {
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
      const groupBy = jest.fn(() => ({ orderBy }));
      const where = jest.fn(() => ({ groupBy }));
      const innerJoin = jest.fn(() => ({ where }));
      const from = jest.fn(() => ({ innerJoin }));
      return { from, innerJoin, where, groupBy, orderBy, limit, offset };
    }

    it('filters to the given date range and paginates, newest first', async () => {
      const start = new Date('2026-08-30T15:00:00.000Z');
      const end = new Date('2026-08-31T15:00:00.000Z');
      const requestRows = [makeRequest({ id: 'request-1' })];
      const replyRows = [makeReply({ id: 'reply-1', requestId: 'request-1' })];
      const countChain = makeCountChain(1);
      const rowsChain = makeRowsChain(requestRows);
      const select = jest
        .fn()
        .mockReturnValueOnce({ from: countChain.from })
        .mockReturnValueOnce({ from: rowsChain.from });
      const findMany = jest.fn().mockResolvedValue(replyRows);
      const db = {
        select,
        query: { replies: { findMany } },
      } as unknown as Database;
      const repository = new RequestsRepository(db);

      const result = await repository.findFeed(
        { start, end },
        { page: 1, pageSize: 20 },
      );

      expect(countChain.where).toHaveBeenCalledWith(
        and(
          eq(requests.hidden, false),
          isNull(requests.deletedAt),
          and(gte(requests.createdAt, start), lt(requests.createdAt, end)),
        ),
      );
      expect(rowsChain.limit).toHaveBeenCalledWith(20);
      expect(rowsChain.offset).toHaveBeenCalledWith(0);
      expect(result).toEqual({
        items: [{ request: requestRows[0], replies: replyRows }],
        totalItems: 1,
      });
    });

    it('does not fetch replies when nothing matches the date range', async () => {
      const countChain = makeCountChain(0);
      const select = jest.fn().mockReturnValueOnce({ from: countChain.from });
      const findMany = jest.fn();
      const db = {
        select,
        query: { replies: { findMany } },
      } as unknown as Database;
      const repository = new RequestsRepository(db);

      const result = await repository.findFeed(
        { start: new Date(), end: new Date() },
        { page: 1, pageSize: 20 },
      );

      expect(result).toEqual({ items: [], totalItems: 0 });
      expect(findMany).not.toHaveBeenCalled();
    });
  });

  describe('findPublicByAuthor', () => {
    it('only fetches revealed, visible requests, newest-first', async () => {
      const rows = [makeRequest({ anonymous: false })];
      const findMany = jest.fn().mockResolvedValue(rows);
      const db = { query: { requests: { findMany } } } as unknown as Database;
      const repository = new RequestsRepository(db);

      const result = await repository.findPublicByAuthor('user-1');

      expect(findMany).toHaveBeenCalledWith({
        where: and(
          eq(requests.authorId, 'user-1'),
          eq(requests.anonymous, false),
          eq(requests.hidden, false),
          isNull(requests.deletedAt),
        ),
        orderBy: desc(requests.createdAt),
      });
      expect(result).toEqual(rows);
    });
  });
});
