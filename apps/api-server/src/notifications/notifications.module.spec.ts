import { NotificationsController } from './notifications.controller';
import { NotificationsModule } from './notifications.module';
import { PushSubscriptionsController } from './push-subscriptions.controller';

// Regression guard for a real bug (see notifications.module.ts's comment):
// NestJS registers routes in `controllers` array order, and
// NotificationsController's `DELETE /notifications/:id` wildcard shadows
// PushSubscriptionsController's literal `DELETE /notifications/push-
// subscriptions` if it's listed first — confirmed live (500 from a
// malformed-UUID DB query) before the array was reordered. Per-controller
// unit/e2e tests can't catch this by construction (each mocks its own
// dependencies and never sees the other controller), so this asserts the
// actual module metadata directly instead.
describe('NotificationsModule', () => {
  it('registers PushSubscriptionsController before NotificationsController', () => {
    const controllers = Reflect.getMetadata(
      'controllers',
      NotificationsModule,
    ) as unknown[];

    const pushSubscriptionsIndex = controllers.indexOf(
      PushSubscriptionsController,
    );
    const notificationsIndex = controllers.indexOf(NotificationsController);

    expect(pushSubscriptionsIndex).toBeGreaterThanOrEqual(0);
    expect(notificationsIndex).toBeGreaterThanOrEqual(0);
    expect(pushSubscriptionsIndex).toBeLessThan(notificationsIndex);
  });
});
