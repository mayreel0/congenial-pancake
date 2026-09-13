jest.mock('drizzle-orm', () => ({
  desc: jest.fn((arg: unknown) => ({ op: 'desc', arg })),
  eq: jest.fn((left: unknown, right: unknown) => ({ op: 'eq', left, right })),
  sql: jest.fn(() => ({ op: 'sql' })),
}));

import { desc, eq } from 'drizzle-orm';
import type { Database } from '../../database/database.types';
import { replyModerationLogs } from '../../database/schema';
import { ReplyModerationLogsRepository } from './reply-moderation-logs.repository';

describe('ReplyModerationLogsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a reply moderation decision snapshot', async () => {
    const row = {
      id: 'log-1',
      replyId: 'reply-1',
      action: 'suggest_rewrite',
      categories: ['judgmental'],
      severity: 2,
      confidence: 0.86,
      reason: '상대의 감정을 판단합니다.',
      suggestions: ['많이 힘들었겠어요.'],
      errorReason: null,
      shouldPersistForTraining: true,
      excludedReason: null,
      createdAt: new Date('2026-09-09T00:00:00.000Z'),
    };
    const returning = jest.fn().mockResolvedValue([row]);
    const values = jest.fn(() => ({ returning }));
    const insert = jest.fn(() => ({ values }));
    const db = { insert } as unknown as Database;
    const repository = new ReplyModerationLogsRepository(db);

    await expect(
      repository.create({
        replyId: 'reply-1',
        action: 'suggest_rewrite',
        categories: ['judgmental'],
        severity: 2,
        confidence: 0.86,
        reason: '상대의 감정을 판단합니다.',
        suggestions: ['많이 힘들었겠어요.'],
        shouldPersistForTraining: true,
      }),
    ).resolves.toEqual(row);

    expect(insert).toHaveBeenCalledWith(replyModerationLogs);
    expect(values).toHaveBeenCalledWith({
      replyId: 'reply-1',
      action: 'suggest_rewrite',
      categories: ['judgmental'],
      severity: 2,
      confidence: 0.86,
      reason: '상대의 감정을 판단합니다.',
      suggestions: ['많이 힘들었겠어요.'],
      shouldPersistForTraining: true,
    });
  });

  it('lists recent logs for one reply newest-first', async () => {
    const rows = [{ id: 'log-2' }, { id: 'log-1' }];
    const orderBy = jest.fn().mockResolvedValue(rows);
    const where = jest.fn(() => ({ orderBy }));
    const from = jest.fn(() => ({ where }));
    const select = jest.fn(() => ({ from }));
    const db = { select } as unknown as Database;
    const repository = new ReplyModerationLogsRepository(db);

    await expect(repository.findByReplyId('reply-1')).resolves.toEqual(rows);

    expect(from).toHaveBeenCalledWith(replyModerationLogs);
    expect(where).toHaveBeenCalledWith(
      eq(replyModerationLogs.replyId, 'reply-1'),
    );
    expect(orderBy).toHaveBeenCalledWith(desc(replyModerationLogs.createdAt));
  });
});
