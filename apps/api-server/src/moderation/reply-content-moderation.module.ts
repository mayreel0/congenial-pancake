import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { DatabaseModule } from '../database/database.module';
import {
  createOpenAIResponsesClient,
  OpenAIReplyRewriter,
  OpenAIReplyToneClassifier,
} from './openai/openai-reply-moderation.provider';
import { ReplyContentModerationService } from './reply-content/reply-content-moderation.service';
import { ReplyModerationLogService } from './reply-content/reply-moderation-log.service';
import { ReplyModerationLogsRepository } from './reply-content/reply-moderation-logs.repository';
import type {
  ReplyRewriter,
  ReplyToneClassifier,
  ToneClassification,
} from './reply-content/reply-content-moderation.types';

// dry-run 단계라 OPENAI_API_KEY가 비어있어도(로컬 개발 기본값) 부팅이 깨지면
// 안 됨 — 이 경우 항상 uncertain/제안 없음을 반환해서, 결정 문서의 "LLM 실패
// 시 자동 allow하지 않는다" 원칙을 그대로 지킨다.
class MissingOpenAIKeyClassifier implements ReplyToneClassifier {
  classify(): Promise<ToneClassification> {
    return Promise.reject(new Error('OPENAI_API_KEY is not set'));
  }
}

class EmptyRewriter implements ReplyRewriter {
  rewrite(): Promise<string[]> {
    return Promise.resolve([]);
  }
}

// 답장 사전 moderation 엔진 전용 모듈 — 신고 누적 기반 사후 moderation
// (ModerationModule/ModerationService)과는 별개다. ModerationModule은
// RepliesModule을 의존하므로, 이 모듈까지 RepliesModule을 의존하면 순환
// 참조가 생겨 따로 뺐다(RepliesModule이 이 모듈을 가져다 씀).
@Module({
  imports: [DatabaseModule],
  providers: [
    ReplyModerationLogsRepository,
    ReplyModerationLogService,
    {
      provide: ReplyContentModerationService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const apiKey = config.get('OPENAI_API_KEY', { infer: true });
        const model = config.get('OPENAI_MODERATION_MODEL', { infer: true });
        if (!apiKey) {
          return new ReplyContentModerationService(
            new MissingOpenAIKeyClassifier(),
            new EmptyRewriter(),
            { captureErrors: true },
          );
        }
        const client = createOpenAIResponsesClient(apiKey);
        return new ReplyContentModerationService(
          // 결정 문서(2026-09-05)의 권장 타임아웃(classifier 3초/rewrite 5초)은
          // 답장 등록을 실시간으로 막는 경우를 전제로 한 값 — 지금은 dry-run이라
          // 아무도 이 응답을 기다리지 않으므로, 그 제약이 적용되지 않는다.
          // 실측(2026-09-14, 실제 사용자 답장)으로 gpt-5-mini 응답이 3초를
          // 넘는 경우가 있어 uncertain으로 잘못 잡히는 걸 확인, eval CLI와
          // 같은 값(20초)으로 넉넉하게 맞춘다. 답장 흐름을 실시간으로 막는
          // 단계로 가면 그때 다시 짧게 줄여야 한다.
          new OpenAIReplyToneClassifier(client, { model, timeoutMs: 20_000 }),
          new OpenAIReplyRewriter(client, { model, timeoutMs: 20_000 }),
          { captureErrors: true },
        );
      },
    },
  ],
  exports: [ReplyContentModerationService, ReplyModerationLogService],
})
export class ReplyContentModerationModule {}
