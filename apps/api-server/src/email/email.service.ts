import { Injectable, Logger } from '@nestjs/common';
import type { EmailMessage, EmailProvider } from './email-provider.interface';
import { ResendEmailProvider } from './providers/resend-email.provider';
import { SesEmailProvider } from './providers/ses-email.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  // Ordered strategy list — tried in sequence, falling through to the next
  // provider on any failure. SES is here as an outage fallback for Resend,
  // not a quota-rotation scheme — at current volume Resend's free tier
  // isn't close to exhausted, and SES already piggybacks on the existing
  // AWS account/IAM role rather than adding a new vendor relationship. Add
  // a provider here to extend the chain — nothing else needs to change.
  private readonly providers: EmailProvider[];

  constructor(resend: ResendEmailProvider, ses: SesEmailProvider) {
    this.providers = [resend, ses];
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
