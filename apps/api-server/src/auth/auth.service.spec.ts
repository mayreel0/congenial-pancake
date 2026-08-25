import { InternalServerErrorException } from '@nestjs/common';
import {
  EmailAlreadyExistsException,
  InvalidCredentialsException,
} from '../common/exceptions/app.exception';
import type { User } from '../users/users.repository';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type {
  OAuthIdentitiesRepository,
  OAuthIdentity,
} from './oauth-identities.repository';
import type { PasswordHasherService } from './password/password-hasher.service';
import type { SessionService } from './session.service';
import type { Session } from './sessions.repository';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed',
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

describe('AuthService', () => {
  let usersService: jest.Mocked<UsersService>;
  let oauthIdentitiesRepository: jest.Mocked<OAuthIdentitiesRepository>;
  let passwordHasher: jest.Mocked<PasswordHasherService>;
  let sessionService: jest.Mocked<SessionService>;
  let authService: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    oauthIdentitiesRepository = {
      findByProviderAccount: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<OAuthIdentitiesRepository>;
    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
    sessionService = {
      createSession: jest.fn(),
    } as unknown as jest.Mocked<SessionService>;

    authService = new AuthService(
      usersService,
      oauthIdentitiesRepository,
      passwordHasher,
      sessionService,
    );
  });

  describe('signup', () => {
    it('throws when the email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());

      await expect(
        authService.signup({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(EmailAlreadyExistsException);
    });

    it('hashes the password and creates a session', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      const user = makeUser();
      usersService.create.mockResolvedValue(user);
      const session = makeSession();
      sessionService.createSession.mockResolvedValue(session);

      const result = await authService.signup({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(passwordHasher.hash).toHaveBeenCalledWith('password123');
      expect(usersService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      });
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

  describe('loginWithGoogle', () => {
    it('reuses the linked user when the identity already exists', async () => {
      const identity = { userId: 'user-1' } as OAuthIdentity;
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue(
        identity,
      );
      const user = makeUser();
      usersService.findById.mockResolvedValue(user);
      const session = makeSession();
      sessionService.createSession.mockResolvedValue(session);

      const result = await authService.loginWithGoogle({
        providerAccountId: 'google-1',
        email: 'test@example.com',
      });

      expect(oauthIdentitiesRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual({ user, session });
    });

    it('throws if a linked identity points at a missing user (data integrity guard)', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue({
        userId: 'ghost',
      } as OAuthIdentity);
      usersService.findById.mockResolvedValue(undefined);

      await expect(
        authService.loginWithGoogle({
          providerAccountId: 'google-1',
          email: 'test@example.com',
        }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('links by existing email when there is no identity yet', async () => {
      oauthIdentitiesRepository.findByProviderAccount.mockResolvedValue(
        undefined,
      );
      const existingUser = makeUser({ passwordHash: 'hashed' });
      usersService.findByEmail.mockResolvedValue(existingUser);
      const session = makeSession();
      sessionService.createSession.mockResolvedValue(session);

      const result = await authService.loginWithGoogle({
        providerAccountId: 'google-1',
        email: 'test@example.com',
      });

      expect(usersService.create).not.toHaveBeenCalled();
      expect(oauthIdentitiesRepository.create).toHaveBeenCalledWith(
        existingUser.id,
        'google',
        'google-1',
      );
      expect(result.user).toEqual(existingUser);
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

      const result = await authService.loginWithGoogle({
        providerAccountId: 'google-2',
        email: 'new@example.com',
      });

      expect(usersService.create).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
      expect(oauthIdentitiesRepository.create).toHaveBeenCalledWith(
        newUser.id,
        'google',
        'google-2',
      );
      expect(result.user).toEqual(newUser);
    });
  });
});
