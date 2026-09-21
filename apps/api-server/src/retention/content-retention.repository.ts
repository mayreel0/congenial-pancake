import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, lt, ne, or } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { replies, replyModerationLogs, requests } from '../database/schema';

export type PurgeResult = { requests: number; replies: number };

@Injectable()
export class ContentRetentionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Soft-deleted content keeps its text for a while (an admin reviewing a
  // report needs to see what was actually written), then this blanks it:
  // a request the author removed (contentRemoved, stamped by
  // contentRemovedAt) or an admin permanently deleted (deletedAt), and a
  // reply whose deletedAt is set (author delete and admin delete share that
  // column). Rows stay — threads and other people's replies are untouched —
  // only the body goes, and the moderation log's rewrite suggestions (text
  // derived from the reply) go with it. `body <> ''` is what keeps a
  // finished row from being picked up again.
  purgeRemovedContent(cutoff: Date): Promise<PurgeResult> {
    return this.db.transaction(async (tx) => {
      const purgedRequests = await tx
        .update(requests)
        .set({ body: '' })
        .where(
          and(
            ne(requests.body, ''),
            or(
              and(
                eq(requests.contentRemoved, true),
                lt(requests.contentRemovedAt, cutoff),
              ),
              lt(requests.deletedAt, cutoff),
            ),
          ),
        )
        .returning({ id: requests.id });

      const purgedReplies = await tx
        .update(replies)
        .set({ body: '' })
        .where(and(ne(replies.body, ''), lt(replies.deletedAt, cutoff)))
        .returning({ id: replies.id });

      if (purgedReplies.length > 0) {
        await tx
          .update(replyModerationLogs)
          .set({ suggestions: [] })
          .where(
            inArray(
              replyModerationLogs.replyId,
              purgedReplies.map((reply) => reply.id),
            ),
          );
      }

      return {
        requests: purgedRequests.length,
        replies: purgedReplies.length,
      };
    });
  }
}
