import { Injectable } from '@nestjs/common';
import { NicknameCooldownException } from '../common/exceptions/app.exception';
import { NICKNAME_COOLDOWN_MS } from './nickname-cooldown.constants';
import {
  UsersRepository,
  type CreateUserInput,
  type User,
} from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findByEmail(email);
  }

  findById(id: string): Promise<User | undefined> {
    return this.usersRepository.findById(id);
  }

  findByIds(ids: string[]): Promise<User[]> {
    return this.usersRepository.findByIds(ids);
  }

  async nicknameMapFor(userIds: string[]): Promise<Map<string, string | null>> {
    const uniqueIds = [...new Set(userIds)];
    const found = await this.usersRepository.findByIds(uniqueIds);
    return new Map(found.map((user) => [user.id, user.nickname]));
  }

  create(input: CreateUserInput): Promise<User> {
    return this.usersRepository.create(input);
  }

  updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    return this.usersRepository.updatePasswordHash(id, passwordHash);
  }

  // Setting a nickname for the first time (from null) is always free —
  // only a change to an already-set nickname is rate-limited, checked
  // against when it was last changed.
  async updateNickname(id: string, nickname: string): Promise<User> {
    const current = await this.usersRepository.findById(id);
    if (current?.nickname !== null && current?.nicknameChangedAt) {
      const elapsedMs = Date.now() - current.nicknameChangedAt.getTime();
      if (elapsedMs < NICKNAME_COOLDOWN_MS) {
        const daysRemaining = Math.ceil(
          (NICKNAME_COOLDOWN_MS - elapsedMs) / (24 * 60 * 60 * 1000),
        );
        throw new NicknameCooldownException(daysRemaining);
      }
    }

    return this.usersRepository.updateNickname(id, nickname);
  }
}
