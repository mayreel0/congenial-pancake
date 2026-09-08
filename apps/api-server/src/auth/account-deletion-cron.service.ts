import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  UsersService,
  WITHDRAWAL_GRACE_PERIOD_DAYS,
} from '../users/users.service';
import { AuthService } from './auth.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The other half of the withdrawal flow (see AuthService.requestWithdrawal
// for the immediate path) — finalizes any account whose 30-day grace
// period has lapsed without being restored. Runs once daily rather than
// on some tighter schedule since a day's imprecision on a 30-day window
// is immaterial, and this app has no other scheduled-job infrastructure
// to justify a finer-grained scheduler setup.
@Injectable()
export class AccountDeletionCronService {
  private readonly logger = new Logger(AccountDeletionCronService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async finalizeExpiredWithdrawals(): Promise<void> {
    const cutoff = new Date(
      Date.now() - WITHDRAWAL_GRACE_PERIOD_DAYS * MS_PER_DAY,
    );
    const pending = await this.usersService.findPendingDeletionBefore(cutoff);
    for (const user of pending) {
      await this.authService.finalizeAccountDeletion(user.id);
    }
    if (pending.length > 0) {
      this.logger.log(`Finalized ${pending.length} expired withdrawal(s).`);
    }
  }
}
