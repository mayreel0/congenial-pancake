import { Injectable } from '@nestjs/common';
import { NicknameCooldownException } from '../common/exceptions/app.exception';
import { SettingsService } from '../settings/settings.service';
import { nicknameDiscriminator } from './nickname-discriminator';
import {
  UsersRepository,
  type CreateUserInput,
  type User,
} from './users.repository';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly settingsService: SettingsService,
  ) {}

  findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findByEmail(email);
  }

  findById(id: string): Promise<User | undefined> {
    return this.usersRepository.findById(id);
  }

  findByIds(ids: string[]): Promise<User[]> {
    return this.usersRepository.findByIds(ids);
  }

  // Public profile lookup: nickname + discriminator together identify one
  // account (Discord-style tag), even though nickname alone isn't unique.
  // Case-insensitive on the discriminator since it's shown/typed as
  // uppercase hex but a URL segment shouldn't be case-sensitive for this.
  // Returns undefined if nobody currently holds that exact nickname (a
  // stale link after someone renames it resolves to nothing — not treated
  // as an error to recover from) **or** if they do but have hidden it
  // (nicknameVisible: false) — same "not findable right now" outcome from
  // the caller's perspective, so this is the one place that decision is
  // made rather than leaking a hidden-but-technically-found user out to
  // ProfileService.
  async findByNicknameAndDiscriminator(
    nickname: string,
    discriminator: string,
  ): Promise<User | undefined> {
    const candidates = await this.usersRepository.findByNickname(nickname);
    const target = discriminator.toUpperCase();
    const match = candidates.find(
      (user) => nicknameDiscriminator(user.id) === target,
    );
    return match?.nicknameVisible ? match : undefined;
  }

  // A hidden nickname (nicknameVisible: false) maps to null here — the same
  // "no nickname" value toAuthorDisplayDto already falls back to anonymous
  // for — rather than being filtered out separately at each call site.
  async nicknameMapFor(userIds: string[]): Promise<Map<string, string | null>> {
    const uniqueIds = [...new Set(userIds)];
    const found = await this.usersRepository.findByIds(uniqueIds);
    return new Map(
      found.map((user) => [
        user.id,
        user.nicknameVisible ? user.nickname : null,
      ]),
    );
  }

  create(input: CreateUserInput): Promise<User> {
    return this.usersRepository.create(input);
  }

  updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    return this.usersRepository.updatePasswordHash(id, passwordHash);
  }

  // Setting a nickname for the first time (from null) is always free —
  // only a change to an already-set nickname is rate-limited, checked
  // against when it was last changed. Cooldown length is admin-tunable
  // (settings.nicknameCooldownDays), not hardcoded — see docs/decisions/
  // 2026-08-29-onseol-nickname-cooldown-decisions.md.
  async updateNickname(id: string, nickname: string): Promise<User> {
    const current = await this.usersRepository.findById(id);
    if (current?.nickname !== null && current?.nicknameChangedAt) {
      const settings = await this.settingsService.get();
      const cooldownMs = settings.nicknameCooldownDays * MS_PER_DAY;
      const elapsedMs = Date.now() - current.nicknameChangedAt.getTime();
      if (elapsedMs < cooldownMs) {
        const daysRemaining = Math.ceil((cooldownMs - elapsedMs) / MS_PER_DAY);
        throw new NicknameCooldownException(daysRemaining);
      }
    }

    return this.usersRepository.updateNickname(id, nickname);
  }

  // Toggling nicknameVisible (bundled in with the other profile-visibility
  // switches) never touches `nickname`/`nicknameChangedAt` — it's always
  // free, no cooldown check, unlike updateNickname above. Since
  // AuthorDisplayDto's author label is resolved live via nicknameMapFor
  // (not snapshotted per post — see common/author-display.ts), hiding it
  // retroactively hides the nickname on every past post too, not just
  // future ones, with no extra masking logic needed — and un-hiding brings
  // it right back, unaffected by the whole time it was hidden.
  updateProfileVisibility(
    id: string,
    patch: Partial<
      Pick<
        User,
        | 'showRequestsOnProfile'
        | 'showRepliesOnProfile'
        | 'showCountsOnProfile'
        | 'nicknameVisible'
      >
    >,
  ): Promise<User> {
    return this.usersRepository.updateProfileVisibility(id, patch);
  }

  // Null if the nickname has never been changed (first-time set is always
  // free — see updateNickname above). Otherwise the timestamp the *next*
  // change becomes allowed — may be in the past, meaning the cooldown
  // already elapsed. AuthController calls this to build UserResponseDto's
  // nicknameChangeAvailableAt for every route that returns a user, not just
  // updateNickname's own response.
  async nicknameChangeAvailableAt(user: User): Promise<Date | null> {
    if (!user.nicknameChangedAt) return null;
    const settings = await this.settingsService.get();
    return new Date(
      user.nicknameChangedAt.getTime() +
        settings.nicknameCooldownDays * MS_PER_DAY,
    );
  }
}
