import { InternalServerErrorException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  EmailAlreadyExistsException,
  EmailNotVerifiedException,
  EmailSendFailedException,
  EmailVerificationTokenInvalidException,
  InvalidCredentialsException,
  OAuthAccountAlreadyLinkedException,
} from '../common/exceptions/app.exception';
import type { Env } from '../config/env.schema';
import type { EmailService } from '../email/email.service';
import type { User } from '../users/users.repository';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type {
  OAuthIdentitiesRepository,
  OAuthIdentity,
} from './oauth-identities.repository';
import type { PasswordHasherService } from './password/password-hasher.service';
import type {
  PendingSignup,
  PendingSignupsRepository,
} from './pending-signups.repository';
import type { SessionService } from './session.service';
import type { Session } from './sessions.repository';

// emailVerifiedAt defaults to already-verified so the many tests below that
// don't care about verification aren't affected by loginWithOAuth's
// "mark verified on login" side effect — tests that specifically exercise
// that behavior pass emailVerifiedAt: null explicitly.
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed',
    nickname: null,
    emailVerifiedAt: new Date('2026-08-20T00:00:00.000Z'),
    nicknameChangedAt: null,
    showRequestsOnProfile: true,
    showRepliesOnProfile: true,
    showCountsOnProfile: true,
    nicknameVisible: true,
    createdAt: new Date('2026-08-20T00:00:00.000Z'),
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    token: 'token-1',
    userId: 'user-1',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    userAgent: null,
    ...overrides,
  };
}

function makePendingSignup(
  overrides: Partial<PendingSignup> = {},
): PendingSignup {
  return {
    id: 'pending-1',
    email: 'test@example.com',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let usersService: jest.Mocked<UsersService>;
  let oauthIdentitiesRepository: jest.Mocked<OAuthIdentitiesRepository>;
  let pendingSignupsRepository: jest.Mocked<PendingSignupsRepository>;
  let passwordHasher: jest.Mocked<PasswordHasherService>;
  let sessionService: jest.Mocked<SessionService>;
  let emailService: jest.Mocked<EmailService>;
  let config: jest.Mocked<ConfigService<Env, true>>;
  let authService: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      markEmailVerified: jest.fn(),
      clearPasswordHash: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    oauthIdentitiesRepository = {
      findByProviderAccount: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<OAuthIdentitiesRepository>;
    pendingSignupsRepository = {
      create: jest.fn(),
      findMostRecentByEmail: jest.fn().mockResolvedValue(undefined),
      findValidByHash: jest.fn(),
      markUsed: jest.fn(),
    } as unknown as jest.Mocked<PendingSignupsRepository>;
    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
    sessionService = {
      createSession: jest.fn(),
    } as unknown as jest.Mocked<SessionService>;
    emailService = {
      send: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;
    config = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    } as unknown as jest.Mocked<ConfigService<Env, true>>;

    authService = new AuthService(
      usersService,
      oauthIdentitiesRepository,
      pendingSignupsRepository,
      passwordHasher,
      sessionService,
      emailService,
      config,
    );
  });

  describe('requestSignup', () => {
    it('throws when the email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());

      await expect(
        authService.requestSignup({ email: 'test@example.com' }),
      ).rejects.toBeInstanceOf(EmailAlreadyExistsException);
      expect(pendingSignupsRepository.create).not.toHaveBeenCalled();
    });

    it('creates a pending signup and emails the link — creates no user', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      emailService.send.mockResolvedValue(undefined);

      await authService.requestSignup({ email: 'new@example.com' });

      expect(pendingSignupsRepository.create).toHaveBeenCalledWith(
        'new@example.com',
        expect.any(String),
        expect.any(Date),
      );
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'new@example.com' }),
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('throws (not swallows) when the email fails to send — nothing else exists yet to fall back on', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      emailService.send.mockRejectedValue(new Error('boom'));

      await expect(
        authService.requestSignup({ email: 'new@example.com' }),
      ).rejects.toBeInstanceOf(EmailSendFailedException);
    });

    it('silently no-ops within the 60s cooldown — same email, no new email sent', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      pendingSignupsRepository.findMostRecentByEmail.mockResolvedValue(
        makePendingSignup({
          email: 'new@example.com',
          createdAt: new Date(Date.now() - 1000),
        }),
      );

      await authService.requestSignup({ email: 'new@example.com' });

      expect(pendingSignupsRepository.create).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('sends again once the cooldown has passed', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      pendingSignupsRepository.findMostRecentByEmail.mockResolvedValue(
        makePendingSignup({
          email: 'new@example.com',
          createdAt: new Date(Date.now() - 61_000),
        }),
      );
      emailService.send.mockResolvedValue(undefined);

      await authService.requestSignup({ email: 'new@example.com' });

      expect(pendingSignupsRepository.create).toHaveBeenCalled();
      expect(emailService.send).toHaveBeenCalled();
    });
  });

  describe('completeSignup', () => {
    it('throws when the token is invalid or expired', async () => {
      pendingSignupsRepository.findValidByHash.mockResolvedValue(undefined);

      await expect(
        authService.completeSignup('bad-token', 'password123'),
      ).rejects.toBeInstanceOf(EmailVerificationTokenInvalidException);
    });

    it('throws when the email got claimed by someone else in the meantime', async () => {
      pendingSignupsRepository.findValidByHash.mockResolvedValue(
        makePendingSignup(),
      );
      usersService.findByEmail.mockResolvedValue(makeUser());

      await expect(
        authService.completeSignup('the-token', 'password123'),
      ).rejects.toBeInstanceOf(EmailAlreadyExistsException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('creates an already-verified account, consumes the token, and logs in', async () => {
      const pending = makePendingSignup({ email: 'new@example.com' });
      pendingSignupsRepository.findValidByHash.mockResolvedValue(pending);
      usersService.findByEmail.mockResolvedValue(undefined);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      const user = makeUser({ email: 'new@example.com' });
      usersService.create.mockResolvedValue(user);
      const session = makeSession();
      sessionService.createSession.mockResolvedValue(session);

      const result = await authService.completeSignup(
        'the-token',
        'password123',
      );

      const createCall = usersService.create.mock.calls[0]?.[0];
      expect(createCall?.email).toBe('new@example.com');
      expect(createCall?.passwordHash).toBe('hashed-password');
      expect(createCall?.emailVerifiedAt).toBeInstanceOf(Date);
      expect(pendingSignupsRepository.markUsed).toHaveBeenCalledWith(
        pending.id,
      );
      expect(result).toEqual({ user, session });
    });
  });

  describe('login', () => {
    it('throws when no user exists for the email', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);

      await expect(
        authService.login({
          email: 'nope@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    });

    it('throws when the account has no password (OAuth-only)', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUser({ passwordHash: null }),
      );

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    });

    it('throws when the password does not match', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());
      passwordHasher.compare.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    });

    it('throws EmailNotVerified for a legacy unverified row even with the correct password', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUser({ emailVerifiedAt: null }),
      );
      passwordHasher.compare.mockResolvedValue(true);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(EmailNotVerifiedException);
      expect(sessionService.createSession).not.toHaveBeenCalled();
    });

    it('creates a session on success', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user);
      passwordHasher.compare.mockResolvedValue(true);
      const session = makeSession();
      sessionService.createSession.mockResolvedValue(session);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({ user, session });
    });
  });

  describe('loginWithOAuth', () => {
    it('reuses the linked user when the identity already exists', async () => {
      const identity = { userId: 'user-1' } as OAuthIdentity;
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue(
        identity,
      );
      const user = makeUser();
      usersService.findById.mockResolvedValue(user);
      const session = makeSession();
      sessionService.createSession.mockResolvedValue(session);

      const result = await authService.loginWithOAuth('google', {
        providerAccountId: 'google-1',
        email: 'test@example.com',
      });

      expect(oauthIdentitiesRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual({ user, session, linkedExistingAccount: false });
    });

    it('throws if a linked identity points at a missing user (data integrity guard)', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue({
        userId: 'ghost',
      } as OAuthIdentity);
      usersService.findById.mockResolvedValue(undefined);

      await expect(
        authService.loginWithOAuth('google', {
          providerAccountId: 'google-1',
          email: 'test@example.com',
        }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('links by existing email when there is no identity yet (existing account already verified)', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue(
        undefined,
      );
      const existingUser = makeUser({ passwordHash: 'hashed' });
      usersService.findByEmail.mockResolvedValue(existingUser);
      const session = makeSession();
      sessionService.createSession.mockResolvedValue(session);

      const result = await authService.loginWithOAuth('google', {
        providerAccountId: 'google-1',
        email: 'test@example.com',
      });

      expect(usersService.create).not.toHaveBeenCalled();
      expect(usersService.clearPasswordHash).not.toHaveBeenCalled();
      expect(oauthIdentitiesRepository.create).toHaveBeenCalledWith(
        existingUser.id,
        'google',
        'google-1',
      );
      expect(result.user).toEqual(existingUser);
      expect(result.linkedExistingAccount).toBe(true);
    });

    it('takes over a legacy unverified account in place instead of creating a new one', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue(
        undefined,
      );
      const legacyAccount = makeUser({
        id: 'legacy-1',
        email: 'test@example.com',
        emailVerifiedAt: null,
      });
      usersService.findByEmail.mockResolvedValue(legacyAccount);
      const session = makeSession();
      sessionService.createSession.mockResolvedValue(session);

      const result = await authService.loginWithOAuth('google', {
        providerAccountId: 'google-1',
        email: 'test@example.com',
      });

      // No new account — the same (provably inert) row is claimed in place.
      expect(usersService.create).not.toHaveBeenCalled();
      expect(usersService.clearPasswordHash).toHaveBeenCalledWith('legacy-1');
      expect(oauthIdentitiesRepository.create).toHaveBeenCalledWith(
        'legacy-1',
        'google',
        'google-1',
      );
      expect(usersService.markEmailVerified).toHaveBeenCalledWith('legacy-1');
      expect(result.user.id).toBe('legacy-1');
      expect(result.user.emailVerifiedAt).not.toBeNull();
      // Not a merge from the caller's point of view — it looks like (and
      // functionally is) a brand-new account, nothing for the frontend to
      // explain.
      expect(result.linkedExistingAccount).toBe(false);
    });

    it('creates a brand new user when neither identity nor email match', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue(
        undefined,
      );
      usersService.findByEmail.mockResolvedValue(undefined);
      const newUser = makeUser({ id: 'user-2', passwordHash: null });
      usersService.create.mockResolvedValue(newUser);
      const session = makeSession();
      sessionService.createSession.mockResolvedValue(session);

      const result = await authService.loginWithOAuth('google', {
        providerAccountId: 'google-2',
        email: 'new@example.com',
      });

      const createCall = usersService.create.mock.calls[0]?.[0];
      expect(createCall?.email).toBe('new@example.com');
      expect(createCall?.emailVerifiedAt).toBeInstanceOf(Date);
      expect(oauthIdentitiesRepository.create).toHaveBeenCalledWith(
        newUser.id,
        'google',
        'google-2',
      );
      expect(result.user).toEqual(newUser);
    });

    it('links by provider when the same email already used a different provider', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue(
        undefined,
      );
      const existingUser = makeUser({ passwordHash: null });
      usersService.findByEmail.mockResolvedValue(existingUser);
      const session = makeSession();
      sessionService.createSession.mockResolvedValue(session);

      const result = await authService.loginWithOAuth('kakao', {
        providerAccountId: 'kakao-1',
        email: 'test@example.com',
      });

      expect(oauthIdentitiesRepository.create).toHaveBeenCalledWith(
        existingUser.id,
        'kakao',
        'kakao-1',
      );
      expect(result.user).toEqual(existingUser);
      expect(result.linkedExistingAccount).toBe(true);
    });

    it('marks an already-linked but still-unverified user as verified on login', async () => {
      const identity = { userId: 'user-1' } as OAuthIdentity;
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue(
        identity,
      );
      const unverifiedUser = makeUser({ emailVerifiedAt: null });
      usersService.findById.mockResolvedValue(unverifiedUser);
      const session = makeSession();
      sessionService.createSession.mockResolvedValue(session);

      const result = await authService.loginWithOAuth('google', {
        providerAccountId: 'google-1',
        email: 'test@example.com',
      });

      expect(usersService.markEmailVerified).toHaveBeenCalledWith('user-1');
      expect(result.user.emailVerifiedAt).not.toBeNull();
    });
  });

  describe('linkOAuth', () => {
    it('attaches the identity to the caller account without touching email matching', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue(
        undefined,
      );
      const user = makeUser({ id: 'user-1' });
      usersService.findById.mockResolvedValue(user);

      const result = await authService.linkOAuth('user-1', 'google', {
        providerAccountId: 'google-1',
        email: 'someone-elses-google-email@example.com',
      });

      expect(usersService.findByEmail).not.toHaveBeenCalled();
      expect(oauthIdentitiesRepository.create).toHaveBeenCalledWith(
        'user-1',
        'google',
        'google-1',
      );
      expect(result).toEqual(user);
    });

    it('is idempotent when the identity is already linked to the same account', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue({
        userId: 'user-1',
      } as OAuthIdentity);
      const user = makeUser({ id: 'user-1' });
      usersService.findById.mockResolvedValue(user);

      await authService.linkOAuth('user-1', 'google', {
        providerAccountId: 'google-1',
        email: 'test@example.com',
      });

      expect(oauthIdentitiesRepository.create).not.toHaveBeenCalled();
    });

    it('throws when the identity already belongs to a different account', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue({
        userId: 'someone-else',
      } as OAuthIdentity);

      await expect(
        authService.linkOAuth('user-1', 'google', {
          providerAccountId: 'google-1',
          email: 'test@example.com',
        }),
      ).rejects.toBeInstanceOf(OAuthAccountAlreadyLinkedException);
      expect(oauthIdentitiesRepository.create).not.toHaveBeenCalled();
    });

    it('marks the caller account verified when the provider email matches the account email', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue(
        undefined,
      );
      const unverifiedUser = makeUser({
        id: 'user-1',
        email: 'test@example.com',
        emailVerifiedAt: null,
      });
      usersService.findById.mockResolvedValue(unverifiedUser);

      const result = await authService.linkOAuth('user-1', 'google', {
        providerAccountId: 'google-1',
        email: 'test@example.com',
      });

      expect(usersService.markEmailVerified).toHaveBeenCalledWith('user-1');
      expect(result.emailVerifiedAt).not.toBeNull();
    });

    it('does NOT mark the account verified when the provider email differs from the account email', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue(
        undefined,
      );
      const unverifiedUser = makeUser({
        id: 'user-1',
        email: 'squatted@example.com',
        emailVerifiedAt: null,
      });
      usersService.findById.mockResolvedValue(unverifiedUser);

      const result = await authService.linkOAuth('user-1', 'google', {
        providerAccountId: 'google-1',
        email: 'attackers-own-real-email@example.com',
      });

      expect(oauthIdentitiesRepository.create).toHaveBeenCalledWith(
        'user-1',
        'google',
        'google-1',
      );
      expect(usersService.markEmailVerified).not.toHaveBeenCalled();
      expect(result.emailVerifiedAt).toBeNull();
    });
  });

  describe('getLinkedProviders', () => {
    it('returns the provider names linked to the user', async () => {
      oauthIdentitiesRepository.findByUserId.mockResolvedValue([
        { provider: 'google' } as OAuthIdentity,
        { provider: 'kakao' } as OAuthIdentity,
      ]);

      const result = await authService.getLinkedProviders('user-1');

      expect(result).toEqual(['google', 'kakao']);
    });
  });
});
