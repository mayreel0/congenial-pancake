import 'dotenv/config';
import {
  createOpenAIResponsesClient,
  OpenAIReplyRewriter,
  OpenAIReplyToneClassifier,
} from './openai-reply-moderation.provider';
import { replyContentModerationEvalCases } from './reply-content-moderation.eval-fixtures';
import {
  formatReplyContentModerationEvalJsonl,
  formatReplyContentModerationEvalTable,
  runReplyContentModerationEval,
} from './reply-content-moderation.eval';
import { ReplyContentModerationService } from './reply-content-moderation.service';
import type {
  ReplyRewriter,
  ReplyToneClassifier,
  ToneClassification,
} from './reply-content-moderation.types';

type EvalFormat = 'jsonl' | 'table';

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

function readArgValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

function readFormat(): EvalFormat {
  const value = readArgValue('format');
  if (value === undefined || value === 'jsonl') return 'jsonl';
  if (value === 'table') return 'table';

  throw new Error(`Unsupported format: ${value}`);
}

async function main(): Promise<void> {
  const format = readFormat();
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  const model = process.env.OPENAI_MODERATION_MODEL || 'gpt-5-mini';
  const service = apiKey
    ? new ReplyContentModerationService(
        new OpenAIReplyToneClassifier(createOpenAIResponsesClient(apiKey), {
          model,
          timeoutMs: 3000,
        }),
        new OpenAIReplyRewriter(createOpenAIResponsesClient(apiKey), {
          model,
          timeoutMs: 5000,
        }),
      )
    : new ReplyContentModerationService(
        new MissingOpenAIKeyClassifier(),
        new EmptyRewriter(),
      );

  const report = await runReplyContentModerationEval(
    service,
    replyContentModerationEvalCases,
  );

  const output =
    format === 'table'
      ? formatReplyContentModerationEvalTable(report)
      : formatReplyContentModerationEvalJsonl(report);

  process.stdout.write(`${output}\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
