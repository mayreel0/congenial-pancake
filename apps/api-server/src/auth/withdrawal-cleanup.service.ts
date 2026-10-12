import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { PushSubscriptionsRepository } from '../notifications/push-subscriptions.repository';
import { UsersService } from '../users/users.service';
import { OAuthIdentitiesRepository } from './oauth-identities.repository';
import { SessionService } from './session.service';

@Injectable()
export class WithdrawalCleanupService {
  constructor(
    private readonly usersService: UsersService,
    private readonly oauthIdentitiesRepository: OAuthIdentitiesRepository,
    private readonly sessionService: SessionService,
    private readonly pushSubscriptionsRepository: PushSubscriptionsRepository,
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async requestWithdrawal(userId: string, immediate: boolean): Promise<void> {
    // Even a reversible withdrawal stops existing sessions and device pushes.
    await this.sessionService.revokeAllForUser(userId);
    await this.pushSubscriptionsRepository.deleteAllForUser(userId);
    if (immediate) {
      await this.finalizeAccountDeletion(userId);
    } else {
      await this.usersService.requestDeletion(userId);
    }
  }

  async finalizeAccountDeletion(userId: string): Promise<void> {
    await this.usersService.scrubForDeletion(userId);
    await this.oauthIdentitiesRepository.deleteAllForUser(userId);
    // Legacy pending withdrawals may reach the cron without request-time cleanup.
    await this.pushSubscriptionsRepository.deleteAllForUser(userId);
    await this.notificationsRepository.deleteAll(userId);
  }
}
