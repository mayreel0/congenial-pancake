import type { User } from '../../users/users.repository';
import { nicknameDiscriminator } from '../../users/nickname-discriminator';
import { NICKNAME_COOLDOWN_MS } from '../../users/nickname-cooldown.constants';

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
};

export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    nickname: user.nickname,
    nicknameDiscriminator: nicknameDiscriminator(user.id),
    nicknameChangeAvailableAt: user.nicknameChangedAt
      ? new Date(user.nicknameChangedAt.getTime() + NICKNAME_COOLDOWN_MS)
      : null,
  };
}
