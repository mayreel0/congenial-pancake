import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import type { EmailMessage, EmailProvider } from '../email-provider.interface';

const RESEND_API_URL = 'https://api.resend.com/emails';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';

  constructor(private readonly config: ConfigService<Env, true>) {}

  async send(message: EmailMessage): Promise<void> {
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true });
    const from = this.config.get('RESEND_FROM_EMAIL', { infer: true });

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Resend send failed (${response.status}): ${body}`);
    }
  }
}
