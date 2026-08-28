import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { NaverCloudMailerProvider } from './providers/naver-cloud-mailer.provider';
import { ResendEmailProvider } from './providers/resend-email.provider';

@Module({
  providers: [ResendEmailProvider, NaverCloudMailerProvider, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
