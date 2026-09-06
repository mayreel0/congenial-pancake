import { nicknameDiscriminator } from '../users/nickname-discriminator';
import type { AuthorDisplayDto } from 'shared/dto';

export type { AuthorDisplayDto };

// `nicknameByUserId` must be built by the caller (batched via
// UsersService.nicknameMapFor) — this stays a pure function so it works the
// same whether it's rendering one record (create()) or a whole list.
export function toAuthorDisplayDto(
  record: { authorId: string | null; anonymous: boolean },
  nicknameByUserId: Map<string, string | null>,
): AuthorDisplayDto {
  if (record.anonymous || record.authorId === null) {
    return { anonymous: true };
  }

  const nickname = nicknameByUserId.get(record.authorId);
  // A member opted out of anonymity but has since cleared their nickname,
  // or the caller's map didn't include them — fall back to anonymous
  // rather than exposing an empty/undefined name.
  if (!nickname) {
    return { anonymous: true };
  }

  return {
    anonymous: false,
    nickname,
    nicknameDiscriminator: nicknameDiscriminator(record.authorId),
  };
}
