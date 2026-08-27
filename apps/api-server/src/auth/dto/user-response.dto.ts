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
  emailVerified: boolean;
};

export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    nickname: user.nickname,
    nicknameDiscriminator: nicknameDiscriminator(user.id),
    emailVerified: user.emailVerifiedAt !== null,
  };
}
