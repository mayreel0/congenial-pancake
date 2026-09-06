import { NotFoundException } from '@nestjs/common';
import type { FeedItem } from '../requests/requests.repository';
import { nicknameDiscriminator } from '../users/nickname-discriminator';
import type { UsersService } from '../users/users.service';
import type { PublicProfileDto } from './dto/public-profile.dto';
import { ProfileController } from './profile.controller';
import type { ProfileService } from './profile.service';

describe('ProfileController', () => {
  let profileService: jest.Mocked<ProfileService>;
  let usersService: jest.Mocked<UsersService>;
  let controller: ProfileController;

  beforeEach(() => {
    profileService = {
      findProfile: jest.fn(),
      findRequestsPage: jest.fn(),
      findRepliesPage: jest.fn(),
      findRequestThread: jest.fn(),
      findReplyThread: jest.fn(),
    } as unknown as jest.Mocked<ProfileService>;
    usersService = {
      nicknameMapFor: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<UsersService>;

    controller = new ProfileController(profileService, usersService);
  });

  describe('profile', () => {
    it('returns the profile when found', async () => {
      const profile: PublicProfileDto = {
        nickname: '민들레',
        nicknameDiscriminator: 'C376',
        requestsVisible: true,
        repliesVisible: true,
        countsVisible: true,
        requestCount: 0,
        replyCount: 0,
        requests: [],
        replies: [],
      };
      profileService.findProfile.mockResolvedValue(profile);

      const result = await controller.profile('민들레', 'C376');

      expect(profileService.findProfile).toHaveBeenCalledWith('민들레', 'C376');
      expect(result).toEqual(profile);
    });

    it('throws NotFoundException when no profile matches', async () => {
      profileService.findProfile.mockResolvedValue(undefined);

      await expect(controller.profile('민들레', 'C376')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('requests', () => {
    it('returns a paginated dto, defaulting page/pageSize', async () => {
      profileService.findRequestsPage.mockResolvedValue({
        items: [
          {
            id: 'request-1',
            body: '고민',
            createdAt: new Date().toISOString(),
          },
        ],
        totalItems: 1,
      });

      const result = await controller.requests(
        '민들레',
        'C376',
        undefined,
        undefined,
      );

      expect(profileService.findRequestsPage).toHaveBeenCalledWith(
        '민들레',
        'C376',
        { page: 1, pageSize: 10 },
      );
      expect(result).toMatchObject({
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      });
    });

    it('throws NotFoundException when the list is hidden or the profile does not exist', async () => {
      profileService.findRequestsPage.mockResolvedValue(undefined);

      await expect(
        controller.requests('민들레', 'C376', undefined, undefined),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('replies', () => {
    it('returns a paginated dto', async () => {
      profileService.findRepliesPage.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      const result = await controller.replies('민들레', 'C376', '2', '20');

      expect(profileService.findRepliesPage).toHaveBeenCalledWith(
        '민들레',
        'C376',
        { page: 2, pageSize: 20 },
      );
      expect(result).toMatchObject({ page: 2, pageSize: 20, totalItems: 0 });
    });

    it('throws NotFoundException when the list is hidden', async () => {
      profileService.findRepliesPage.mockResolvedValue(undefined);

      await expect(
        controller.replies('민들레', 'C376', undefined, undefined),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('requestThread', () => {
    it('returns the thread dto, resolving nicknames for everyone in it', async () => {
      const item: FeedItem = {
        request: {
          id: 'request-1',
          body: '고민',
          authorId: 'user-1',
          guestId: null,
          createdAt: new Date('2026-08-21T00:00:00.000Z'),
          hidden: false,
          deletedAt: null,
          reviewedAt: null,
          anonymous: false,
        },
        replies: [
          {
            id: 'reply-1',
            requestId: 'request-1',
            body: '답변',
            authorId: 'user-2',
            guestId: null,
            createdAt: new Date('2026-08-21T01:00:00.000Z'),
            hidden: false,
            deletedAt: null,
            reviewedAt: null,
            anonymous: false,
          },
        ],
      };
      profileService.findRequestThread.mockResolvedValue(item);
      usersService.nicknameMapFor.mockResolvedValue(
        new Map([
          ['user-1', '민들레'],
          ['user-2', '조용한 파도'],
        ]),
      );

      const result = await controller.requestThread(
        '민들레',
        'C376',
        'request-1',
      );

      expect(profileService.findRequestThread).toHaveBeenCalledWith(
        '민들레',
        'C376',
        'request-1',
      );
      expect(usersService.nicknameMapFor).toHaveBeenCalledWith([
        'user-1',
        'user-2',
      ]);
      expect(result.request.author).toEqual({
        anonymous: false,
        nickname: '민들레',
        nicknameDiscriminator: nicknameDiscriminator('user-1'),
      });
      expect(result.replies[0].author).toEqual({
        anonymous: false,
        nickname: '조용한 파도',
        nicknameDiscriminator: nicknameDiscriminator('user-2'),
      });
    });

    it('throws NotFoundException when the thread is not this profile owner’s own revealed post', async () => {
      profileService.findRequestThread.mockResolvedValue(undefined);

      await expect(
        controller.requestThread('민들레', 'C376', 'request-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('replyThread', () => {
    it('throws NotFoundException when the reply is not this profile owner’s own revealed reply', async () => {
      profileService.findReplyThread.mockResolvedValue(undefined);

      await expect(
        controller.replyThread('민들레', 'C376', 'reply-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
