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
// route shape (/notifications/push-subscriptions) under the same prefix,
// and keeping it here sidesteps NestJS's route-declaration-order pitfall
// where a literal path can get shadowed by an already-declared `:id`
// wildcard on the same method+depth.
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

  // No ownership check needed before deleting — the endpoint itself
  // (a long, effectively unguessable push-service URL the browser
  // generated) is the only thing identifying which row to remove, and a
  // member can only ever have gotten it from their own browser's
  // PushManager.subscribe() in the first place.
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Body() dto: DeletePushSubscriptionDto): Promise<void> {
    await this.pushSubscriptionsRepository.deleteByEndpoint(dto.endpoint);
  }
}
