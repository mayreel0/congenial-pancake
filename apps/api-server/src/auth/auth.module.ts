import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthIdentitiesRepository } from './oauth-identities.repository';
import { GoogleOAuthProvider } from './oauth/google-oauth.provider';
import { KakaoOAuthProvider } from './oauth/kakao-oauth.provider';
import { NaverOAuthProvider } from './oauth/naver-oauth.provider';
import { OAuthProviderRegistry } from './oauth/oauth-provider-registry';
import { OptionalSessionGuard } from './optional-session.guard';
import { PasswordHasherService } from './password/password-hasher.service';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [DatabaseModule, UsersModule],
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
    AuthService,
  ],
  exports: [
    SessionService,
    SessionGuard,
    OptionalSessionGuard,
    PasswordHasherService,
  ],
})
export class AuthModule {}
