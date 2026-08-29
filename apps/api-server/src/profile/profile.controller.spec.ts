import { NotFoundException } from '@nestjs/common';
import type { PublicProfileDto } from './dto/public-profile.dto';
import { ProfileController } from './profile.controller';
import type { ProfileService } from './profile.service';

describe('ProfileController', () => {
  let profileService: jest.Mocked<ProfileService>;
  let controller: ProfileController;

  beforeEach(() => {
    profileService = {
      findProfile: jest.fn(),
    } as unknown as jest.Mocked<ProfileService>;

    controller = new ProfileController(profileService);
  });

  it('returns the profile when found', async () => {
    const profile: PublicProfileDto = {
      nickname: '민들레',
      nicknameDiscriminator: 'C376',
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
