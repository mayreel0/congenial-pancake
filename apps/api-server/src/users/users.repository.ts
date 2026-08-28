import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
      .set({ nickname })
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
}
