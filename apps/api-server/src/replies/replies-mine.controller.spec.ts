import { kstDateRange } from '../common/kst-date';
import type { UsersService } from '../users/users.service';
import { RepliesMineController } from './replies-mine.controller';
import type { RepliesService } from './replies.service';

describe('RepliesMineController', () => {
  let repliesService: jest.Mocked<RepliesService>;
  let usersService: jest.Mocked<UsersService>;
  let controller: RepliesMineController;

  beforeEach(() => {
    repliesService = {
      findMine: jest.fn().mockResolvedValue({ items: [], totalItems: 0 }),
    } as unknown as jest.Mocked<RepliesService>;
    usersService = {
      nicknameMapFor: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<UsersService>;

    controller = new RepliesMineController(repliesService, usersService);
  });

  it('defaults to an unbounded date range when neither from nor to is given', async () => {
    await controller.mine('user-1', 'guest-1', undefined, undefined, undefined);

    expect(repliesService.findMine).toHaveBeenCalledWith(
      'user-1',
      'guest-1',
      kstDateRange(undefined, undefined),
      { page: 1, pageSize: 20 },
    );
  });

  it('applies a valid from/to range', async () => {
    await controller.mine(
      'user-1',
      'guest-1',
      '2026-08-01',
      '2026-08-31',
      undefined,
    );

    expect(repliesService.findMine).toHaveBeenCalledWith(
      'user-1',
      'guest-1',
      kstDateRange('2026-08-01', '2026-08-31'),
      { page: 1, pageSize: 20 },
    );
  });

  it('ignores a malformed from/to param instead of erroring', async () => {
    await controller.mine(
      'user-1',
      'guest-1',
      'not-a-date',
      '2026/08/31',
      undefined,
    );

    expect(repliesService.findMine).toHaveBeenCalledWith(
      'user-1',
      'guest-1',
      kstDateRange(undefined, undefined),
      { page: 1, pageSize: 20 },
    );
  });

  it('parses the page param, defaulting invalid values to 1', async () => {
    await controller.mine('user-1', 'guest-1', undefined, undefined, '2');

    expect(repliesService.findMine).toHaveBeenCalledWith(
      'user-1',
      'guest-1',
      kstDateRange(undefined, undefined),
      { page: 2, pageSize: 20 },
    );
  });

  it('returns a paginated envelope built from totalItems', async () => {
    repliesService.findMine.mockResolvedValue({
      items: [],
      totalItems: 45,
    });

    const result = await controller.mine(
      'user-1',
      'guest-1',
      undefined,
      undefined,
      undefined,
    );

    expect(result).toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3,
    });
  });
});
