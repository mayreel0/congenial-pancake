import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { settings } from '../database/schema';

export type SettingsRecord = typeof settings.$inferSelect;
export type UpdateSettingsInput = Partial<
  Pick<
    SettingsRecord,
    'queueFreshnessHours' | 'queueReplyCap' | 'guestReplyLimit'
  >
>;

@Injectable()
export class SettingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Lazily creates the single row (id 1) on first read instead of relying on
  // a seeded migration — self-healing if the row is ever missing, and keeps
  // the schema's own column defaults as the single source of truth for
  // initial values instead of duplicating them into migration SQL.
  async get(): Promise<SettingsRecord> {
    const existing = await this.db.query.settings.findFirst({
      where: eq(settings.id, 1),
    });
    if (existing) return existing;

    const [created] = await this.db
      .insert(settings)
      .values({ id: 1 })
      .onConflictDoNothing()
      .returning();
    if (created) return created;

    // Lost a race with a concurrent first read — the other insert won.
    const row = await this.db.query.settings.findFirst({
      where: eq(settings.id, 1),
    });
    if (!row) throw new Error('settings row missing after insert race');
    return row;
  }

  async update(input: UpdateSettingsInput): Promise<SettingsRecord> {
    await this.get(); // ensure the row exists before updating it
    const [updated] = await this.db
      .update(settings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(settings.id, 1))
      .returning();
    return updated;
  }
}
