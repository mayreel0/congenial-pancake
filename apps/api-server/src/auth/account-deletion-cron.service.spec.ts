import type { User, UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import type { SettingsService } from '../settings/settings.service';
import { AccountDeletionCronService } from './account-deletion-cron.service';
import type { AuthService } from './auth.service';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: null,
    nickname: null,
    emailVerifiedAt: new Date('2026-08-01T00:00:00.000Z'),
    nicknameChangedAt: null,
    showRequestsOnProfile: true,
    showRepliesOnProfile: true,
    showCountsOnProfile: true,
    nicknameVisible: true,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    deletionRequestedAt: new Date('2026-08-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('AccountDeletionCronService', () => {
  let usersRepository: jest.Mocked<UsersRepository>;
  let authService: jest.Mocked<AuthService>;
  let usersService: UsersService;
  let cronService: AccountDeletionCronService;

  beforeEach(() => {
    usersRepository = {
      findPendingDeletionBefore: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    usersService = new UsersService(
      usersRepository,
      {} as unknown as SettingsService,
    );
    authService = {
      finalizeAccountDeletion: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    cronService = new AccountDeletionCronService(usersService, authService);
  });

  it('finalizes every account whose grace period has lapsed', async () => {
    usersRepository.findPendingDeletionBefore.mockResolvedValue([
      makeUser({ id: 'user-1' }),
      makeUser({ id: 'user-2' }),
    ]);

    await cronService.finalizeExpiredWithdrawals();

    expect(authService.finalizeAccountDeletion).toHaveBeenCalledTimes(2);
    expect(authService.finalizeAccountDeletion).toHaveBeenCalledWith('user-1');
    expect(authService.finalizeAccountDeletion).toHaveBeenCalledWith('user-2');
  });

  it('queries with a cutoff 30 days before now', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-09T00:00:00.000Z'));
    usersRepository.findPendingDeletionBefore.mockResolvedValue([]);

    await cronService.finalizeExpiredWithdrawals();

    expect(usersRepository.findPendingDeletionBefore).toHaveBeenCalledWith(
      new Date('2026-08-10T00:00:00.000Z'),
    );
    jest.useRealTimers();
  });

  it('does nothing when no accounts are past their grace period', async () => {
    usersRepository.findPendingDeletionBefore.mockResolvedValue([]);

    await cronService.finalizeExpiredWithdrawals();

    expect(authService.finalizeAccountDeletion).not.toHaveBeenCalled();
  });
});
