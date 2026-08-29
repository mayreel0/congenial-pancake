import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { users } from '../database/schema';

export type CreateUserInput = {
  email: string;
  passwordHash?: string;
};

export type User = typeof users.$inferSelect;

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findByEmail(email: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  findById(id: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.db.query.users.findMany({
      where: inArray(users.id, ids),
    });
  }

  // Nickname isn't unique (see users.schema.ts) — callers resolve the
  // specific user via nicknameDiscriminator(id) among these candidates.
  // Nearly always 0-1 rows in practice; a table scan here is fine at this
  // scale (no index on nickname, matching there being no uniqueness
  // constraint to index against).
  findByNickname(nickname: string): Promise<User[]> {
    return this.db.query.users.findMany({
      where: eq(users.nickname, nickname),
    });
  }

  async create(input: CreateUserInput): Promise<User> {
    const [user] = await this.db.insert(users).values(input).returning();
    return user;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async updateNickname(id: string, nickname: string): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ nickname, nicknameChangedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Resets nicknameChangedAt too (not just nickname) — a cleared nickname
  // has no cooldown to protect, and UsersService.updateNickname's cooldown
  // check is already gated on "current nickname is non-null", so leaving a
  // stale nicknameChangedAt around here would be inert but confusing.
  async clearNickname(id: string): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ nickname: null, nicknameChangedAt: null })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateProfileVisibility(
    id: string,
    patch: Partial<
      Pick<
        User,
        'showRequestsOnProfile' | 'showRepliesOnProfile' | 'showCountsOnProfile'
      >
    >,
  ): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set(patch)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
}
