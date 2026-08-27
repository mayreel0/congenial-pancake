import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { EmailVerificationTokenInvalidException } from '../../common/exceptions/app.exception';
import { EmailService } from '../../email/email.service';
import { UsersService } from '../../users/users.service';
import { EmailVerificationTokensRepository } from './email-verification-tokens.repository';

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h — long enough for someone to check an inbox at their own pace, unlike the admin-issued password-reset link's 30 minutes.

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly tokensRepository: EmailVerificationTokensRepository,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await this.tokensRepository.create(userId, hashToken(token), expiresAt);

    const webUrl = this.config.get('WEB_PUBLIC_URL', { infer: true });
    const verifyUrl = `${webUrl}/verify-email?token=${token}`;

    await this.emailService.send({
      to: email,
      subject: '온설 이메일을 인증해주세요',
      html: `<p>아래 링크를 눌러 이메일 인증을 완료해주세요.</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>이 링크는 24시간 동안만 유효합니다.</p>`,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.tokensRepository.findValidByHash(
      hashToken(token),
    );
    if (!record) throw new EmailVerificationTokenInvalidException();

    await this.usersService.markEmailVerified(record.userId);
    await this.tokensRepository.markUsed(record.id);
  }
}
