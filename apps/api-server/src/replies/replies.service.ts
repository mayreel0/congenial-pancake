import { Injectable, Logger } from '@nestjs/common';
import { AnswerInteractionsService } from '../answer-interactions/answer-interactions.service';
import {
  NicknameRequiredException,
  ReplyAlreadySubmittedException,
  ReplyGuestLimitExceededException,
  ReplyNotFoundException,
  RequestNotFoundException,
} from '../common/exceptions/app.exception';
import { ReplyContentModerationService } from '../moderation/reply-content/reply-content-moderation.service';
import { ReplyModerationLogService } from '../moderation/reply-content/reply-moderation-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  DateRange,
  DayCount,
  PagedResult,
  Pagination,
  ViewerIdentity,
} from '../requests/requests.repository';
import { RequestsService } from '../requests/requests.service';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import type { CreateReplyDto } from './dto/create-reply.dto';
import {
  RepliesRepository,
  type ReplyRecord,
  type ReplyWithRequest,
} from './replies.repository';

@Injectable()
export class RepliesService {
  private readonly logger = new Logger(RepliesService.name);

  constructor(
    private readonly repliesRepository: RepliesRepository,
    private readonly requestsService: RequestsService,
    private readonly answerInteractionsService: AnswerInteractionsService,
    private readonly settingsService: SettingsService,
    private readonly usersService: UsersService,
    private readonly replyContentModerationService: ReplyContentModerationService,
    private readonly replyModerationLogService: ReplyModerationLogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Only a member request author can be notified later (a guest has no
  // session to check back with), and replying to your own request
  // shouldn't notify yourself. Fire-and-forget like moderateInBackground —
  // the reply itself is already saved by the time this runs, so a
  // notification-row failure must never surface as a failed reply
  // submission.
  private notifyRequestAuthor(
    requestAuthorId: string | null,
    requestId: string,
    reply: ReplyRecord,
    replierUserId: string | undefined,
  ): void {
    if (!requestAuthorId || requestAuthorId === replierUserId) return;
    this.notificationsService
      .createReplyReceived(requestAuthorId, requestId, reply.id)
      .catch((error) => {
        this.logger.error(
          `Failed to create reply-received notification for reply ${reply.id}`,
          error instanceof Error ? error.stack : error,
        );
      });
  }

  // Dry-run 전용 — 결과를 절대 await하지 않는다. 답장 등록 응답 시간에
  // 영향을 주면 안 되고(사용자 확인, 2026-09-14), moderation 호출이 실패해도
  // 답장 자체는 이미 저장·반환된 뒤라 사용자에게 아무 영향이 없어야 한다.
  private moderateInBackground(reply: ReplyRecord, isLoadTest: boolean): void {
    this.replyContentModerationService
      .moderate({
        text: reply.body,
        surface: 'reply',
        metadata: isLoadTest
          ? { isLoadTest: true, source: 'load_test' }
          : { source: 'user' },
      })
      .then((result) =>
        this.replyModerationLogService.recordDryRunResult(reply.id, result),
      )
      .catch((error) => {
        this.logger.error(
          `Reply moderation dry-run failed for reply ${reply.id}`,
          error instanceof Error ? error.stack : error,
        );
      });
  }

  async create(
    requestId: string,
    dto: CreateReplyDto,
    userId: string | undefined,
    guestId: string,
    isLoadTest = false,
  ): Promise<ReplyRecord> {
    const request = await this.requestsService.findVisibleById(requestId);
    // A self-deleted request must not be replyable, even via a direct call
    // that skips the answer queue (which already excludes it as a
    // candidate) — findVisibleById itself can't filter this out, since it's
    // also used to render a removed request's own thread page with its
    // placeholder body (see docs/decisions/2026-09-09-onseol-own-content-
    // deletion-decisions.md).
    if (!request || request.contentRemoved)
      throw new RequestNotFoundException();

    if (userId) {
      const existing = await this.repliesRepository.findByRequestAndAuthor(
        requestId,
        userId,
      );
      if (existing) throw new ReplyAlreadySubmittedException();

      // A password account only ever gets created already-verified now
      // (see AuthService.completeSignup), and OAuth accounts are always
      // instantly verified — so a logged-in member is never unverified,
      // and never needs the guest-level reply cap applied to it.
      const user = await this.usersService.findById(userId);

      // A guest can never reply non-anonymously — dto.anonymous is only
      // meaningful here, on the member path.
      const anonymous = dto.anonymous !== false;
      if (!anonymous) {
        if (!user?.nickname) throw new NicknameRequiredException();
      }

      const reply = await this.repliesRepository.create({
        requestId,
        body: dto.body,
        authorId: userId,
        anonymous,
      });
      // Answering a held request resolves it — it shouldn't linger in the
      // hold panel once there's a reply for it.
      await this.answerInteractionsService.clearForViewer(
        requestId,
        userId,
        undefined,
      );
      this.moderateInBackground(reply, isLoadTest);
      this.notifyRequestAuthor(request.authorId, requestId, reply, userId);
      return reply;
    }

    // See docs/decisions/2026-08-21-onseol-anonymous-posting-decisions.md —
    // a global budget per guestId across every request, not per-request.
    const [guestReplyCount, settings] = await Promise.all([
      this.repliesRepository.countByGuest(guestId),
      this.settingsService.get(),
    ]);
    if (guestReplyCount >= settings.guestReplyLimit) {
      throw new ReplyGuestLimitExceededException(settings.guestReplyLimit);
    }

    const reply = await this.repliesRepository.create({
      requestId,
      body: dto.body,
      guestId,
    });
    await this.answerInteractionsService.clearForViewer(
      requestId,
      undefined,
      guestId,
    );
    this.moderateInBackground(reply, isLoadTest);
    this.notifyRequestAuthor(request.authorId, requestId, reply, undefined);
    return reply;
  }

  findVisibleByRequestId(requestId: string): Promise<ReplyRecord[]> {
    return this.repliesRepository.findVisibleByRequestId(requestId);
  }

  findVisibleById(id: string): Promise<ReplyRecord | undefined> {
    return this.repliesRepository.findVisibleById(id);
  }

  findMine(
    userId: string | undefined,
    guestId: string,
    range: DateRange,
    pagination: Pagination,
  ): Promise<PagedResult<ReplyWithRequest>> {
    return this.repliesRepository.findMine(
      userId ? { authorId: userId } : { guestId },
      range,
      pagination,
    );
  }

  countMineByDay(
    userId: string | undefined,
    guestId: string,
    range: DateRange,
  ): Promise<DayCount[]> {
    const viewer: ViewerIdentity = userId ? { authorId: userId } : { guestId };
    return this.repliesRepository.countMineByDay(viewer, range);
  }

  findPublicByAuthor(
    authorId: string,
    pagination: Pagination,
  ): Promise<PagedResult<ReplyWithRequest>> {
    return this.repliesRepository.findPublicByAuthor(authorId, pagination);
  }

  hide(id: string): Promise<void> {
    return this.repliesRepository.setHidden(id, true);
  }

  findHidden(): Promise<ReplyWithRequest[]> {
    return this.repliesRepository.findHidden();
  }

  restore(id: string): Promise<void> {
    return this.repliesRepository.restore(id);
  }

  softDelete(id: string): Promise<void> {
    return this.repliesRepository.softDelete(id);
  }

  // Member-only self-service delete. Unlike a request's contentRemoved
  // flag, a reply isn't the parent of anything else — deleting it never
  // needs to preserve someone else's content, so this just reuses the
  // same soft-delete admin moderation already uses (removed from every
  // view, same as admin's own "영구 삭제").
  async deleteOwn(userId: string, id: string): Promise<void> {
    const reply = await this.repliesRepository.findById(id);
    if (!reply || reply.authorId !== userId) {
      throw new ReplyNotFoundException();
    }
    await this.repliesRepository.softDelete(id);
  }
}
