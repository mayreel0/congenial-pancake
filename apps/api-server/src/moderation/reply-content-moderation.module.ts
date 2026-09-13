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
          // 결정 문서(2026-09-05)의 권장 타임아웃: classifier 3초, rewrite 5초.
          new OpenAIReplyToneClassifier(client, { model, timeoutMs: 3_000 }),
          new OpenAIReplyRewriter(client, { model, timeoutMs: 5_000 }),
          { captureErrors: true },
        );
      },
    },
  ],
  exports: [ReplyContentModerationService, ReplyModerationLogService],
})
export class ReplyContentModerationModule {}
