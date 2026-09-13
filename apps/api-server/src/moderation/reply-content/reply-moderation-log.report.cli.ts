import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../database/schema';
import {
  formatReplyModerationLogSummary,
  summarizeReplyModerationLogs,
} from './reply-moderation-log.report';
import { ReplyModerationLogsRepository } from './reply-moderation-logs.repository';

function readDaysArg(): number {
  const prefix = '--days=';
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  const value = raw ? Number(raw.slice(prefix.length)) : 7;
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Unsupported --days value: ${raw}`);
  }
  return value;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run moderation:report');
  }

  const days = readDaysArg();
  const client = postgres(databaseUrl);
  try {
    const db = drizzle(client, { schema });
    const repository = new ReplyModerationLogsRepository(db);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await repository.findSince(since);

    console.log(`최근 ${days}일 (since ${since.toISOString()})`);
    console.log(
      formatReplyModerationLogSummary(summarizeReplyModerationLogs(rows)),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
