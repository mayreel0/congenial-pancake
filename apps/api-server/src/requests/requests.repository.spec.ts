jest.mock('drizzle-orm', () => ({
  and: jest.fn((...args: unknown[]) => ({ op: 'and', args })),
  asc: jest.fn((arg: unknown) => ({ op: 'asc', arg })),
  count: jest.fn((arg?: unknown) => ({ op: 'count', arg })),
  desc: jest.fn((arg: unknown) => ({ op: 'desc', arg })),
  eq: jest.fn((left: unknown, right: unknown) => ({ op: 'eq', left, right })),
  gt: jest.fn((left: unknown, right: unknown) => ({ op: 'gt', left, right })),
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

import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
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
      const requestOrderBy = jest.fn().mockResolvedValue(requestRows);
      const requestWhere = jest.fn(() => ({ orderBy: requestOrderBy }));
      const requestFrom = jest.fn(() => ({ where: requestWhere }));
      const select = jest.fn(() => ({ from: requestFrom }));
      const findMany = jest.fn().mockResolvedValue(replyRows);
      const db = {
        select,
        query: { replies: { findMany } },
      } as unknown as Database;
      const repository = new RequestsRepository(db);

      const result = await repository.findMine('user-1');

      expect(select).toHaveBeenCalledWith({
        id: requests.id,
        body: requests.body,
        authorId: requests.authorId,
        guestId: requests.guestId,
        createdAt: requests.createdAt,
        hidden: requests.hidden,
        deletedAt: requests.deletedAt,
        reviewedAt: requests.reviewedAt,
        anonymous: requests.anonymous,
      });
      expect(requestWhere).toHaveBeenCalledWith(
        eq(requests.authorId, 'user-1'),
      );
      expect(requestOrderBy).toHaveBeenCalledWith(desc(requests.createdAt));
      expect(findMany).toHaveBeenCalledWith({
        where: inArray(replies.requestId, ['request-2', 'request-1']),
        orderBy: asc(replies.createdAt),
      });
      expect(result).toEqual([
        { request: requestRows[0], replies: [replyRows[1]] },
        { request: requestRows[1], replies: [replyRows[0]] },
      ]);
    });

    it('does not fetch replies when the author has no requests', async () => {
      const requestOrderBy = jest.fn().mockResolvedValue([]);
      const requestWhere = jest.fn(() => ({ orderBy: requestOrderBy }));
      const requestFrom = jest.fn(() => ({ where: requestWhere }));
      const select = jest.fn(() => ({ from: requestFrom }));
      const findMany = jest.fn();
      const db = {
        select,
        query: { replies: { findMany } },
      } as unknown as Database;
      const repository = new RequestsRepository(db);

      const result = await repository.findMine('user-1');

      expect(result).toEqual([]);
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
