import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RepliesModule } from '../replies/replies.module';
import { ReportsModule } from '../reports/reports.module';
import { RequestsModule } from '../requests/requests.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [
    AuthModule,
    RequestsModule,
    RepliesModule,
    ReportsModule,
    SettingsModule,
  ],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
