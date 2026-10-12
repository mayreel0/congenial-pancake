import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsPersistenceModule } from './notifications-persistence.module';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { WebPushService } from './web-push.service';

@Module({
  imports: [NotificationsPersistenceModule, AuthModule],
  // PushSubscriptionsController first — its literal
  // DELETE /notifications/push-subscriptions must register before
  // NotificationsController's DELETE /notifications/:id wildcard, or the
  // wildcard matches "push-subscriptions" as :id first (confirmed live:
  // the request reached NotificationsService.deleteOne with id
  // "push-subscriptions", a non-UUID, and 500'd on the DB query).
  // Controller order in this array is route registration order.
  controllers: [PushSubscriptionsController, NotificationsController],
  providers: [NotificationsService, WebPushService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
