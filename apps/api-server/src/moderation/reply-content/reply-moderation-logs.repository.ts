import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants';
import type { Database } from '../../database/database.types';
import { replyModerationLogs } from '../../database/schema';
import type {
  ModerationAction,
  ModerationCategory,
  ModerationExcludedReason,
} from './reply-content-moderation.types';

export type CreateReplyModerationLogInput = {
  replyId: string;
  action: ModerationAction;
  categories: ModerationCategory[];
  severity: 0 | 1 | 2 | 3 | 4 | 5;
  confidence: number;
  reason: string;
  suggestions: string[];
  errorReason?: string;
  shouldPersistForTraining: boolean;
  excludedReason?: ModerationExcludedReason;
};

export type ReplyModerationLogRecord = typeof replyModerationLogs.$inferSelect;

@Injectable()
export class ReplyModerationLogsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(
    input: CreateReplyModerationLogInput,
  ): Promise<ReplyModerationLogRecord> {
    const [log] = await this.db
      .insert(replyModerationLogs)
      .values(input)
      .returning();
    return log;
  }

  findByReplyId(replyId: string): Promise<ReplyModerationLogRecord[]> {
    return this.db
      .select()
      .from(replyModerationLogs)
      .where(eq(replyModerationLogs.replyId, replyId))
      .orderBy(desc(replyModerationLogs.createdAt));
  }
}
