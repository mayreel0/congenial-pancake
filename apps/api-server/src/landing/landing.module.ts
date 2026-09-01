import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LandingController } from './landing.controller';
import { LandingRepository } from './landing.repository';
import { LandingService } from './landing.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LandingController],
  providers: [LandingRepository, LandingService],
})
export class LandingModule {}
