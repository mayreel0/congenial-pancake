import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerificationTokensRepository } from './email-verification/email-verification-tokens.repository';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { OAuthIdentitiesRepository } from './oauth-identities.repository';
import { GoogleOAuthProvider } from './oauth/google-oauth.provider';
import { KakaoOAuthProvider } from './oauth/kakao-oauth.provider';
import { NaverOAuthProvider } from './oauth/naver-oauth.provider';
import { OAuthProviderRegistry } from './oauth/oauth-provider-registry';
import { OptionalSessionGuard } from './optional-session.guard';
import { PasswordHasherService } from './password/password-hasher.service';
import { PasswordResetTokensRepository } from './password-reset/password-reset-tokens.repository';
import { PasswordResetService } from './password-reset/password-reset.service';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [DatabaseModule, UsersModule, EmailModule],
  controllers: [AuthController],
  providers: [
    SessionsRepository,
    SessionService,
    SessionGuard,
    OptionalSessionGuard,
    PasswordHasherService,
    OAuthIdentitiesRepository,
    GoogleOAuthProvider,
    KakaoOAuthProvider,
    NaverOAuthProvider,
    OAuthProviderRegistry,
    PasswordResetTokensRepository,
    PasswordResetService,
    EmailVerificationTokensRepository,
    EmailVerificationService,
    AuthService,
  ],
  exports: [
    SessionService,
    SessionGuard,
    OptionalSessionGuard,
    PasswordHasherService,
    PasswordResetService,
  ],
})
export class AuthModule {}
