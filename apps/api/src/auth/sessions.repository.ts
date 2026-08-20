import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { sessions } from '../database/schema';

export type CreateSessionInput = {
  userId: string;
  token: string;
  expiresAt: Date;
  userAgent?: string;
};

export type Session = typeof sessions.$inferSelect;

@Injectable()
export class SessionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateSessionInput): Promise<Session> {
    const [session] = await this.db.insert(sessions).values(input).returning();
    return session;
  }

  findByToken(token: string): Promise<Session | undefined> {
    return this.db.query.sessions.findFirst({
      where: eq(sessions.token, token),
    });
  }

  async deleteByToken(token: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.token, token));
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }
}
