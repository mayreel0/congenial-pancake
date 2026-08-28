import { Injectable } from '@nestjs/common';
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

  create(input: CreateUserInput): Promise<User> {
    return this.usersRepository.create(input);
  }

  updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    return this.usersRepository.updatePasswordHash(id, passwordHash);
  }

  updateNickname(id: string, nickname: string): Promise<User> {
    return this.usersRepository.updateNickname(id, nickname);
  }

  markEmailVerified(id: string): Promise<void> {
    return this.usersRepository.markEmailVerified(id);
  }
}
