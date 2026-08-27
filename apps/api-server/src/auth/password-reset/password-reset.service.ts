import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { PasswordResetTokenInvalidException } from '../../common/exceptions/app.exception';
import { UsersService } from '../../users/users.service';
import { PasswordHasherService } from '../password/password-hasher.service';
import { PasswordResetTokensRepository } from './password-reset-tokens.repository';

const TOKEN_BYTES = 32;
// Issued and used by the same admin in one sitting (not emailed and left
// sitting in an inbox) — short-lived on purpose.
const TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly tokensRepository: PasswordResetTokensRepository,
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async issueLink(userId: string): Promise<string> {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await this.tokensRepository.create(userId, hashToken(token), expiresAt);
    return `${this.config.get('WEB_PUBLIC_URL', { infer: true })}/reset-password?token=${token}`;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.tokensRepository.findValidByHash(
      hashToken(token),
    );
    if (!record) throw new PasswordResetTokenInvalidException();

    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.usersService.updatePasswordHash(record.userId, passwordHash);
    await this.tokensRepository.markUsed(record.id);
  }
}
