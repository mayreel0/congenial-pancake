import { Module } from '@nestjs/common';
import { RepliesModule } from '../replies/replies.module';
import { RequestsModule } from '../requests/requests.module';
import { UsersModule } from '../users/users.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

// Separate module rather than adding this controller into UsersModule
// directly — UsersModule is imported by RequestsModule/RepliesModule
// already, so UsersModule importing them back would be circular.
@Module({
  imports: [UsersModule, RequestsModule, RepliesModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
