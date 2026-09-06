import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule, SettingsModule],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
