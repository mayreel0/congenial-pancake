import type { User } from '../../users/users.repository';
import { nicknameDiscriminator } from '../../users/nickname-discriminator';

export type UserResponseDto = {
  id: string;
  email: string;
  createdAt: Date;
  nickname: string | null;
  // Always present regardless of whether nickname is set — cheap to
  // compute, harmless unused, and the frontend needs it the moment a
  // nickname exists without a second round trip.
  nicknameDiscriminator: string;
  // null if the nickname has never been changed (first-time set is always
  // free — see UsersService.updateNickname). Otherwise the timestamp the
  // *next* change becomes allowed — may be in the past, meaning the
  // cooldown has already elapsed. Lets the frontend show/disable
  // proactively instead of only finding out from a failed request.
  nicknameChangeAvailableAt: Date | null;
  // Independent public-profile (/u/[slug]) visibility switches — see
  // users.schema.ts and ProfileService.findProfile.
  showRequestsOnProfile: boolean;
  showRepliesOnProfile: boolean;
  showCountsOnProfile: boolean;
};

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
    createdAt: user.createdAt,
    nickname: user.nickname,
    nicknameDiscriminator: nicknameDiscriminator(user.id),
    nicknameChangeAvailableAt,
    showRequestsOnProfile: user.showRequestsOnProfile,
    showRepliesOnProfile: user.showRepliesOnProfile,
    showCountsOnProfile: user.showCountsOnProfile,
  };
}
