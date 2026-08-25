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
}
