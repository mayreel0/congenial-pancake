import { NicknameCooldownException } from '../common/exceptions/app.exception';
import type { User, UsersRepository } from './users.repository';
import { UsersService } from './users.service';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: null,
    nickname: null,
    nicknameChangedAt: null,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
  };
}

describe('UsersService', () => {
  let usersRepository: jest.Mocked<UsersRepository>;
  let usersService: UsersService;

  beforeEach(() => {
    usersRepository = {
      findById: jest.fn(),
      updateNickname: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    usersService = new UsersService(usersRepository);
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
  });
});
