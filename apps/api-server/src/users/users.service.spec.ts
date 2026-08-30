import { NicknameCooldownException } from '../common/exceptions/app.exception';
import type { SettingsService } from '../settings/settings.service';
import type { SettingsRecord } from '../settings/settings.repository';
import type { User, UsersRepository } from './users.repository';
import { UsersService } from './users.service';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: null,
    nickname: null,
    nicknameChangedAt: null,
    showRequestsOnProfile: true,
    showRepliesOnProfile: true,
    showCountsOnProfile: true,
    nicknameVisible: true,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
  };
}

function makeSettings(overrides: Partial<SettingsRecord> = {}): SettingsRecord {
  return {
    id: 1,
    queueFreshnessHours: 60,
    queueReplyCap: 5,
    guestReplyLimit: 5,
    nicknameCooldownDays: 7,
    updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
  };
}

describe('UsersService', () => {
  let usersRepository: jest.Mocked<UsersRepository>;
  let settingsService: jest.Mocked<SettingsService>;
  let usersService: UsersService;

  beforeEach(() => {
    usersRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      updateNickname: jest.fn(),
      findByNickname: jest.fn(),
      updateProfileVisibility: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    settingsService = {
      get: jest.fn().mockResolvedValue(makeSettings()),
    } as unknown as jest.Mocked<SettingsService>;

    usersService = new UsersService(usersRepository, settingsService);
  });

  describe('updateNickname', () => {
    it('allows setting a nickname for the first time with no cooldown check', async () => {
      usersRepository.findById.mockResolvedValue(
        makeUser({ nickname: null, nicknameChangedAt: null }),
      );
      const updated = makeUser({
        nickname: '민들레',
        nicknameChangedAt: new Date(),
      });
      usersRepository.updateNickname.mockResolvedValue(updated);

      const result = await usersService.updateNickname('user-1', '민들레');

      expect(usersRepository.updateNickname).toHaveBeenCalledWith(
        'user-1',
        '민들레',
      );
      expect(result).toEqual(updated);
    });

    it('rejects a change within the 7-day cooldown', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      usersRepository.findById.mockResolvedValue(
        makeUser({ nickname: '민들레', nicknameChangedAt: twoDaysAgo }),
      );

      await expect(
        usersService.updateNickname('user-1', '다른닉네임'),
      ).rejects.toBeInstanceOf(NicknameCooldownException);
      expect(usersRepository.updateNickname).not.toHaveBeenCalled();
    });

    it('allows a change once the 7-day cooldown has elapsed', async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      usersRepository.findById.mockResolvedValue(
        makeUser({ nickname: '민들레', nicknameChangedAt: eightDaysAgo }),
      );
      const updated = makeUser({
        nickname: '다른닉네임',
        nicknameChangedAt: new Date(),
      });
      usersRepository.updateNickname.mockResolvedValue(updated);

      const result = await usersService.updateNickname('user-1', '다른닉네임');

      expect(usersRepository.updateNickname).toHaveBeenCalledWith(
        'user-1',
        '다른닉네임',
      );
      expect(result).toEqual(updated);
    });

    it('reads the cooldown length from settings, not a hardcoded value', async () => {
      settingsService.get.mockResolvedValue(
        makeSettings({ nicknameCooldownDays: 1 }),
      );
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      usersRepository.findById.mockResolvedValue(
        makeUser({ nickname: '민들레', nicknameChangedAt: twoDaysAgo }),
      );
      const updated = makeUser({
        nickname: '다른닉네임',
        nicknameChangedAt: new Date(),
      });
      usersRepository.updateNickname.mockResolvedValue(updated);

      // A 1-day cooldown means 2 days ago is already past it, even though
      // the default 7-day cooldown would still reject this.
      const result = await usersService.updateNickname('user-1', '다른닉네임');

      expect(result).toEqual(updated);
    });
  });

  describe('nicknameChangeAvailableAt', () => {
    it('returns null when the nickname has never been changed', async () => {
      const result = await usersService.nicknameChangeAvailableAt(
        makeUser({ nicknameChangedAt: null }),
      );

      expect(result).toBeNull();
      expect(settingsService.get).not.toHaveBeenCalled();
    });

    it('returns nicknameChangedAt offset by the configured cooldown', async () => {
      settingsService.get.mockResolvedValue(
        makeSettings({ nicknameCooldownDays: 3 }),
      );
      const changedAt = new Date('2026-08-21T00:00:00.000Z');

      const result = await usersService.nicknameChangeAvailableAt(
        makeUser({ nicknameChangedAt: changedAt }),
      );

      expect(result).toEqual(new Date('2026-08-24T00:00:00.000Z'));
    });
  });

  describe('findByNicknameAndDiscriminator', () => {
    it('picks the candidate whose id hashes to the requested discriminator', async () => {
      usersRepository.findByNickname.mockResolvedValue([
        makeUser({
          id: 'aaaaaaaa-0000-0000-0000-000000000001',
          nickname: '민들레',
        }),
        makeUser({
          id: 'f8b3cf41-d4ee-4bce-9d5d-425fb33ac376',
          nickname: '민들레',
        }),
      ]);

      const result = await usersService.findByNicknameAndDiscriminator(
        '민들레',
        'C376',
      );

      expect(usersRepository.findByNickname).toHaveBeenCalledWith('민들레');
      expect(result?.id).toBe('f8b3cf41-d4ee-4bce-9d5d-425fb33ac376');
    });

    it('is case-insensitive on the discriminator', async () => {
      usersRepository.findByNickname.mockResolvedValue([
        makeUser({
          id: 'f8b3cf41-d4ee-4bce-9d5d-425fb33ac376',
          nickname: '민들레',
        }),
      ]);

      const result = await usersService.findByNicknameAndDiscriminator(
        '민들레',
        'c376',
      );

      expect(result?.id).toBe('f8b3cf41-d4ee-4bce-9d5d-425fb33ac376');
    });

    it('returns undefined when nobody currently holds that nickname', async () => {
      usersRepository.findByNickname.mockResolvedValue([]);

      const result = await usersService.findByNicknameAndDiscriminator(
        '민들레',
        'C376',
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when the matching account has hidden its nickname', async () => {
      usersRepository.findByNickname.mockResolvedValue([
        makeUser({
          id: 'f8b3cf41-d4ee-4bce-9d5d-425fb33ac376',
          nickname: '민들레',
          nicknameVisible: false,
        }),
      ]);

      const result = await usersService.findByNicknameAndDiscriminator(
        '민들레',
        'C376',
      );

      expect(result).toBeUndefined();
    });
  });

  describe('nicknameMapFor', () => {
    it('maps a hidden nickname to null, same as no nickname set', async () => {
      usersRepository.findByIds.mockResolvedValue([
        makeUser({ id: 'user-1', nickname: '민들레', nicknameVisible: true }),
        makeUser({ id: 'user-2', nickname: '햇살', nicknameVisible: false }),
      ]);

      const result = await usersService.nicknameMapFor(['user-1', 'user-2']);

      expect(result.get('user-1')).toBe('민들레');
      expect(result.get('user-2')).toBeNull();
    });
  });

  describe('updateProfileVisibility', () => {
    it('delegates the partial patch as-is', async () => {
      const updated = makeUser({ showRequestsOnProfile: false });
      usersRepository.updateProfileVisibility.mockResolvedValue(updated);

      const result = await usersService.updateProfileVisibility('user-1', {
        showRequestsOnProfile: false,
      });

      expect(usersRepository.updateProfileVisibility).toHaveBeenCalledWith(
        'user-1',
        { showRequestsOnProfile: false },
      );
      expect(result).toEqual(updated);
    });

    it('toggling nicknameVisible never touches nickname or nicknameChangedAt', async () => {
      const updated = makeUser({ nicknameVisible: false });
      usersRepository.updateProfileVisibility.mockResolvedValue(updated);

      await usersService.updateProfileVisibility('user-1', {
        nicknameVisible: false,
      });

      expect(usersRepository.updateProfileVisibility).toHaveBeenCalledWith(
        'user-1',
        { nicknameVisible: false },
      );
      // No cooldown consultation at all — hiding/unhiding is always free,
      // unlike updateNickname's cooldown-gated path.
      expect(settingsService.get).not.toHaveBeenCalled();
      expect(usersRepository.findById).not.toHaveBeenCalled();
      expect(usersRepository.updateNickname).not.toHaveBeenCalled();
    });
  });
});
