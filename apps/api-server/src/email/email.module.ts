import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ResendEmailProvider } from './providers/resend-email.provider';
import { SesEmailProvider } from './providers/ses-email.provider';

@Module({
  providers: [ResendEmailProvider, SesEmailProvider, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
