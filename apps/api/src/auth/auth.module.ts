import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PasswordHasherService } from './password/password-hasher.service';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    SessionsRepository,
    SessionService,
    SessionGuard,
    PasswordHasherService,
  ],
  exports: [SessionService, SessionGuard, PasswordHasherService],
})
export class AuthModule {}
