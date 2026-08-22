import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { savedReplies } from '../database/schema';

@Injectable()
export class SavedRepliesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async save(replyId: string, authorId: string): Promise<void> {
    await this.db
      .insert(savedReplies)
      .values({ replyId, authorId })
      .onConflictDoNothing({
        target: [savedReplies.replyId, savedReplies.authorId],
      });
  }

  async unsave(replyId: string, authorId: string): Promise<void> {
    await this.db
      .delete(savedReplies)
      .where(
        and(
          eq(savedReplies.replyId, replyId),
          eq(savedReplies.authorId, authorId),
        ),
      );
  }

  async findSavedReplyIdsForAuthor(authorId: string): Promise<string[]> {
    const rows = await this.db
      .select({ replyId: savedReplies.replyId })
      .from(savedReplies)
      .where(eq(savedReplies.authorId, authorId));
    return rows.map((row) => row.replyId);
  }
}
