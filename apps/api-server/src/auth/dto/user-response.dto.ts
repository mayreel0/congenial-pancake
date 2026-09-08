import { createZodDto } from 'nestjs-zod';
import { userResponseSchema } from 'shared/dto';
import type { User } from '../../users/users.repository';
import { nicknameDiscriminator } from '../../users/nickname-discriminator';
import type { OAuthProviderName } from '../oauth/oauth-provider-registry';

export class UserResponseDto extends createZodDto(userResponseSchema) {}

// nicknameChangeAvailableAt/linkedProviders are required (not defaulted)
// params, not computed here — the cooldown length is admin-tunable
// (settings.nicknameCooldownDays) and linked providers need a DB lookup
// (AuthService.getLinkedProviders) — this stays a pure sync mapper, and
// every caller must fetch both first so a forgotten call site fails
// typecheck instead of silently returning wrong/stale data.
export function toUserResponseDto(
  user: User,
  nicknameChangeAvailableAt: Date | null,
  linkedProviders: OAuthProviderName[],
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
    linkedProviders,
  };
}
