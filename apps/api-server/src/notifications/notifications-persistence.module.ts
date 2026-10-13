import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotificationsRepository } from './notifications.repository';
import { PushSubscriptionsRepository } from './push-subscriptions.repository';

// Storage must not depend on authenticated controllers: account cleanup also uses it.
@Module({
  imports: [DatabaseModule],
  providers: [NotificationsRepository, PushSubscriptionsRepository],
  exports: [NotificationsRepository, PushSubscriptionsRepository],
})
export class NotificationsPersistenceModule {}
