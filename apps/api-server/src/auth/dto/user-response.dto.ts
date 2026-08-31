import { createZodDto } from 'nestjs-zod';
import { userResponseSchema } from 'shared/dto';
import type { User } from '../../users/users.repository';
import { nicknameDiscriminator } from '../../users/nickname-discriminator';

export class UserResponseDto extends createZodDto(userResponseSchema) {}

// nicknameChangeAvailableAt is a required (not defaulted) param, not
// computed here, because the cooldown length is admin-tunable
// (settings.nicknameCooldownDays) — this stays a pure sync mapper, and
// every caller must go through UsersService.nicknameChangeAvailableAt()
// first so a forgotten call site fails typecheck instead of silently
// returning a wrong/stale availability.
export function toUserResponseDto(
  user: User,
  nicknameChangeAvailableAt: Date | null,
): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    nickname: user.nickname,
    nicknameDiscriminator: nicknameDiscriminator(user.id),
    nicknameChangeAvailableAt: nicknameChangeAvailableAt?.toISOString() ?? null,
    showRequestsOnProfile: user.showRequestsOnProfile,
    showRepliesOnProfile: user.showRepliesOnProfile,
    showCountsOnProfile: user.showCountsOnProfile,
    nicknameVisible: user.nicknameVisible,
  };
}
