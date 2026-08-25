import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SessionsRepository, type Session } from './sessions.repository';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TOKEN_BYTES = 32;

@Injectable()
export class SessionService {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async createSession(userId: string, userAgent?: string): Promise<Session> {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    return this.sessionsRepository.create({
      userId,
      token,
      expiresAt,
      userAgent,
    });
  }

  async validateToken(token: string): Promise<Session | null> {
    const session = await this.sessionsRepository.findByToken(token);
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await this.sessionsRepository.deleteByToken(token);
      return null;
    }
    return session;
  }

  revokeToken(token: string): Promise<void> {
    return this.sessionsRepository.deleteByToken(token);
  }

  revokeAllForUser(userId: string): Promise<void> {
    return this.sessionsRepository.deleteAllForUser(userId);
  }
}
