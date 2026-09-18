import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionGuard } from '../auth/session.guard';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';
import { DeletePushSubscriptionDto } from './dto/delete-push-subscription.dto';
import { PushSubscriptionsRepository } from './push-subscriptions.repository';

// Separate from NotificationsController for the same reason
// RepliesMineController is separate from RepliesController — a distinct
// route shape (/notifications/push-subscriptions) under the same prefix.
// This alone doesn't avoid NestJS's route-matching pitfall though — the
// module's `controllers` array order still has to list this class before
// NotificationsController, or its literal path gets shadowed by that
// controller's `:id` wildcard (see notifications.module.ts's comment;
// NotificationsController's `:id` param also takes ParseUUIDPipe now as
// a second line of defense).
@ApiTags('notifications')
@Controller('notifications/push-subscriptions')
@UseGuards(SessionGuard)
export class PushSubscriptionsController {
  constructor(
    private readonly pushSubscriptionsRepository: PushSubscriptionsRepository,
  ) {}

  // Idempotent — re-subscribing the same browser (e.g. the frontend calls
  // this on every mount to keep the row's userId current after a
  // login/logout) upserts on endpoint rather than erroring.
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreatePushSubscriptionDto,
  ): Promise<void> {
    await this.pushSubscriptionsRepository.upsert({
      userId,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
    });
  }

  // Scoped to the caller's own userId, not the endpoint alone — an
  // endpoint value could in principle leak somewhere (a proxy log, a
  // shared device), so relying on "hard to guess" alone would let an
  // authenticated-as-someone-else caller remove another member's
  // subscription just by replaying it.
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() userId: string,
    @Body() dto: DeletePushSubscriptionDto,
  ): Promise<void> {
    await this.pushSubscriptionsRepository.deleteByEndpointForUser(
      dto.endpoint,
      userId,
    );
  }
}
