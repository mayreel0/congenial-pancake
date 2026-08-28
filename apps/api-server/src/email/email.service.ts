import { Injectable, Logger } from '@nestjs/common';
import type { EmailMessage, EmailProvider } from './email-provider.interface';
import { NaverCloudMailerProvider } from './providers/naver-cloud-mailer.provider';
import { ResendEmailProvider } from './providers/resend-email.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  // Ordered strategy list — tried in sequence, falling through to the next
  // provider on any failure (not just quota/rate-limit errors specifically:
  // there's no reliable way to distinguish "quota exhausted" from "provider
  // down" from "misconfigured" across providers with different error
  // shapes, and falling through is the safe default for all three). Add a
  // provider here to extend the chain — nothing else needs to change.
  private readonly providers: EmailProvider[];

  constructor(
    resend: ResendEmailProvider,
    naverCloudMailer: NaverCloudMailerProvider,
  ) {
    this.providers = [resend, naverCloudMailer];
  }

  async send(message: EmailMessage): Promise<void> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      try {
        await provider.send(message);
        return;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `${provider.name} failed to send, trying next provider: ${reason}`,
        );
        errors.push(`${provider.name}: ${reason}`);
      }
    }

    throw new Error(`All email providers failed — ${errors.join(' | ')}`);
  }
}
