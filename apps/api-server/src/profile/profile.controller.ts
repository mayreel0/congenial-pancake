import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { PublicProfileDto } from './dto/public-profile.dto';
import { ProfileService } from './profile.service';

// Public — no auth guard. Reachable from anywhere a nickname is shown
// (/read, /answer, /records) so anyone recognizes the same person across
// posts, same as /read itself needs no session.
@ApiTags('users')
@Controller('users')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(':nickname/:discriminator')
  async profile(
    @Param('nickname') nickname: string,
    @Param('discriminator') discriminator: string,
  ): Promise<PublicProfileDto> {
    const profile = await this.profileService.findProfile(
      nickname,
      discriminator,
    );
    if (!profile) throw new NotFoundException();
    return profile;
  }
}
