import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  EmailAlreadyExistsException,
  InvalidCredentialsException,
} from '../common/exceptions/app.exception';
import { UsersService } from '../users/users.service';
import type { User } from '../users/users.repository';
import type { LoginDto } from './dto/login.dto';
import type { SignupDto } from './dto/signup.dto';
import { OAuthIdentitiesRepository } from './oauth-identities.repository';
import type { OAuthProfile } from './oauth/oauth-provider.interface';
import { PasswordHasherService } from './password/password-hasher.service';
import { SessionService } from './session.service';
import type { Session } from './sessions.repository';

type AuthResult = { user: User; session: Session };

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly oauthIdentitiesRepository: OAuthIdentitiesRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly sessionService: SessionService,
  ) {}

  async signup(dto: SignupDto, userAgent?: string): Promise<AuthResult> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new EmailAlreadyExistsException();

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
    });
    const session = await this.sessionService.createSession(user.id, userAgent);
    return { user, session };
  }

  async login(dto: LoginDto, userAgent?: string): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user?.passwordHash) throw new InvalidCredentialsException();

    const valid = await this.passwordHasher.compare(
      dto.password,
      user.passwordHash,
    );
    if (!valid) throw new InvalidCredentialsException();

    const session = await this.sessionService.createSession(user.id, userAgent);
    return { user, session };
  }

  async loginWithGoogle(
    profile: OAuthProfile,
    userAgent?: string,
  ): Promise<AuthResult> {
    const existingIdentity =
      await this.oauthIdentitiesRepository.findByProviderAccount(
        'google',
        profile.providerAccountId,
      );

    let user: User;
    if (existingIdentity) {
      const found = await this.usersService.findById(existingIdentity.userId);
      if (!found) {
        throw new InternalServerErrorException(
          'OAuth identity references a missing user.',
        );
      }
      user = found;
    } else {
      // Link by verified email if this person already has a password account.
      user =
        (await this.usersService.findByEmail(profile.email)) ??
        (await this.usersService.create({ email: profile.email }));
      await this.oauthIdentitiesRepository.create(
        user.id,
        'google',
        profile.providerAccountId,
      );
    }

    const session = await this.sessionService.createSession(user.id, userAgent);
    return { user, session };
  }
}
