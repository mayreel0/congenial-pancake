import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, lt } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { users } from '../database/schema';

export type CreateUserInput = {
  email: string;
  passwordHash?: string;
  // OAuth signups pass this as `new Date()` — the provider already vouched
  // for the email, so there's no separate verification step for them.
  // Password signups omit it and verify via email_verification_tokens.
  emailVerifiedAt?: Date;
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

  // Only ever called when an OAuth login takes over a still-unverified
  // password account (see AuthService.loginWithOAuth) — the password on
  // file was never actually proven to belong to whoever just showed up
  // with real OAuth proof, so it's cleared rather than left as a
  // lingering way back in for whoever originally set it.
  async clearPasswordHash(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash: null })
      .where(eq(users.id, id));
  }

  async updateNickname(id: string, nickname: string): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ nickname, nicknameChangedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateProfileVisibility(
    id: string,
    patch: Partial<
      Pick<
        User,
        | 'showRequestsOnProfile'
        | 'showRepliesOnProfile'
        | 'showCountsOnProfile'
        | 'nicknameVisible'
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

  async markEmailVerified(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Starts the 30-day grace period — nothing else about the row changes
  // yet (see users.schema.ts).
  async requestDeletion(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ deletionRequestedAt: new Date() })
      .where(eq(users.id, id));
  }

  async restoreAccount(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ deletionRequestedAt: null })
      .where(eq(users.id, id));
  }

  // The actual scrub, shared by both the immediate-deletion path and
  // AccountDeletionCronService once the grace period lapses. email is
  // replaced (not nulled) since the column is NOT NULL UNIQUE — a
  // synthesized value keyed on the row's own id is guaranteed unique
  // without a schema change. requests/replies authored by this user are
  // deliberately untouched — see the comment on users.schema.ts's
  // deletedAt column.
  async scrubForDeletion(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        email: `deleted-${id}@deleted.invalid`,
        nickname: null,
        passwordHash: null,
        deletedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  // Accounts whose grace period is over and haven't been finalized yet —
  // AccountDeletionCronService's daily sweep.
  findPendingDeletionBefore(cutoff: Date): Promise<User[]> {
    return this.db.query.users.findMany({
      where: and(
        lt(users.deletionRequestedAt, cutoff),
        isNull(users.deletedAt),
      ),
    });
  }
}
