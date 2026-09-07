import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import type { EmailMessage, EmailProvider } from '../email-provider.interface';

@Injectable()
export class SesEmailProvider implements EmailProvider {
  readonly name = 'ses';

  private readonly client: SESClient;

  constructor(private readonly config: ConfigService<Env, true>) {
    // No access key/secret here — the SDK's default credential provider
    // chain resolves credentials itself (the EC2 instance role in
    // production, a local ~/.aws/credentials profile or AWS_ACCESS_KEY_ID
    // env vars in development). See infra/terraform/ec2.tf's
    // onseol-api-ec2-role for the production grant.
    this.client = new SESClient({
      region: this.config.get('AWS_REGION', { infer: true }),
    });
  }

  async send(message: EmailMessage): Promise<void> {
    const from = this.config.get('SES_FROM_EMAIL', { infer: true });

    await this.client.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [message.to] },
        Message: {
          Subject: { Data: message.subject, Charset: 'UTF-8' },
          Body: { Html: { Data: message.html, Charset: 'UTF-8' } },
        },
      }),
    );
  }
}
