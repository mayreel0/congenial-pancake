import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import type { EmailMessage, EmailProvider } from '../email-provider.interface';

const API_HOST = 'https://mail.apigw.ntruss.com';
const API_PATH = '/api/v1/mails';

// NCP API Gateway's standard signing scheme (shared across NCP products,
// not specific to Cloud Outbound Mailer) — HMAC-SHA256 of
// "{method} {path}\n{timestamp}\n{accessKey}", base64-encoded. Structurally
// implemented from documented NCP conventions; hasn't been exercised
// against a real NCP account yet (no credentials to test with) — verify
// end-to-end once NAVER_CLOUD_MAILER_* is actually set.
function sign(
  method: string,
  path: string,
  timestamp: string,
  accessKey: string,
  secretKey: string,
): string {
  const message = `${method} ${path}\n${timestamp}\n${accessKey}`;
  return createHmac('sha256', secretKey).update(message).digest('base64');
}

@Injectable()
export class NaverCloudMailerProvider implements EmailProvider {
  readonly name = 'naver-cloud-mailer';

  constructor(private readonly config: ConfigService<Env, true>) {}

  async send(message: EmailMessage): Promise<void> {
    const accessKey = this.config.get('NAVER_CLOUD_MAILER_ACCESS_KEY', {
      infer: true,
    });
    const secretKey = this.config.get('NAVER_CLOUD_MAILER_SECRET_KEY', {
      infer: true,
    });
    const senderAddress = this.config.get('NAVER_CLOUD_MAILER_FROM_EMAIL', {
      infer: true,
    });

    const timestamp = Date.now().toString();
    const signature = sign('POST', API_PATH, timestamp, accessKey, secretKey);

    const response = await fetch(`${API_HOST}${API_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': accessKey,
        'x-ncp-apigw-signature-v2': signature,
      },
      body: JSON.stringify({
        senderAddress,
        senderName: '온설',
        title: message.subject,
        body: message.html,
        recipients: [{ address: message.to, type: 'R' }],
        individual: true,
        advertising: false,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Naver Cloud Mailer send failed (${response.status}): ${body}`,
      );
    }
  }
}
