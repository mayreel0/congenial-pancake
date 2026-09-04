// Fixture data for scenarios/*.js. Deliberately bypasses /auth/signup,
// /auth/login, and the real guest-id-cookie mint flow entirely — session
// tokens and requests/replies are inserted straight into Postgres, so
// re-running a load test never depends on hitting rate-limited or
// email-sending code paths. This also means the scenarios stay unaffected
// if the real auth mechanism ever changes (e.g. sessions -> JWT): only
// this script's session-minting step would need to change (sign a JWT
// instead of inserting a sessions row), the k6 side stays the same
// (Authorization: Bearer <token>).
//
// Every row this script creates (or that a scenario creates while
// running) is tagged so `--cleanup` can find and remove all of it:
// user emails match `loadtest-%@loadtest.onseol.internal`, guest ids match
// `loadtest-%`. Scenarios that mint their own guest ids at runtime MUST
// keep using that same `loadtest-` prefix, or their rows won't be swept.
//
// Run with `nvm use` active (Node 24.14.0 — its native TS type-stripping
// is what lets this run as `node seed.ts` with no build step, same as
// packages/shared elsewhere in this repo).
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Auto-loads tools/load-test/.env if present (Node 24's native support, no
// dotenv dependency) — so DATABASE_URL etc. never has to be exported by
// hand or re-sourced per terminal session. Silently does nothing if the
// file doesn't exist (e.g. running seed.ts before ever copying
// .env.example) rather than throwing.
const dotenvPath = join(__dirname, '.env');
if (existsSync(dotenvPath)) process.loadEnvFile(dotenvPath);

const EMAIL_DOMAIN = 'loadtest.onseol.internal';
const GUEST_PREFIX = 'loadtest-';
const TOKENS_OUT_PATH = join(__dirname, '.output', 'tokens.json');
// k6's --summary-export doesn't create its target directory itself, so
// seeding (which always runs before any scenario anyway) creates it here.
const RESULTS_DIR = join(__dirname, '.output', 'results');

function argNumber(name: string, fallback: number): number {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) return fallback;
  const value = Number(match.split('=')[1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const CLEANUP = process.argv.includes('--cleanup');
const USER_COUNT = argNumber('users', 100);
const REQUEST_COUNT = argNumber('requests', 300);
const QUEUE_POOL_COUNT = argNumber('queue-pool', 15);

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://user:password@localhost:5432/onseol';

const sql = postgres(DATABASE_URL);

const BODY_SAMPLES = [
  '요즘 잠이 잘 안 와서 고민이에요.',
  '친구랑 다퉜는데 먼저 연락해야 할지 모르겠어요.',
  '새로운 일을 시작하는 게 너무 두려워요.',
  '가족이랑 자꾸 부딪히는데 어떻게 해야 할까요.',
  '혼자 있는 시간이 편한 게 이상한 걸까요.',
  '돈 관리가 너무 어려워요, 다들 어떻게 하시나요.',
  '이직을 고민 중인데 확신이 안 서요.',
  '운동을 시작하고 싶은데 매번 작심삼일이에요.',
];

function randomBody(tag: string): string {
  const base = BODY_SAMPLES[Math.floor(Math.random() * BODY_SAMPLES.length)];
  return `[load-test:${tag}] ${base}`;
}

async function cleanup(): Promise<void> {
  console.log('Cleaning up load-test fixtures...');
  const emailPattern = `loadtest-%@${EMAIL_DOMAIN}`;
  const guestPattern = `${GUEST_PREFIX}%`;

  const repliesDeleted = await sql`
    DELETE FROM replies
    WHERE guest_id LIKE ${guestPattern}
       OR author_id IN (SELECT id FROM users WHERE email LIKE ${emailPattern})
  `;
  const requestsDeleted = await sql`
    DELETE FROM requests
    WHERE guest_id LIKE ${guestPattern}
       OR author_id IN (SELECT id FROM users WHERE email LIKE ${emailPattern})
  `;
  const sessionsDeleted = await sql`
    DELETE FROM sessions
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE ${emailPattern})
  `;
  const usersDeleted = await sql`
    DELETE FROM users WHERE email LIKE ${emailPattern}
  `;

  console.log(
    `Deleted: ${repliesDeleted.count} replies, ${requestsDeleted.count} requests, ` +
      `${sessionsDeleted.count} sessions, ${usersDeleted.count} users.`,
  );
}

async function seed(): Promise<void> {
  console.log(
    `Seeding ${USER_COUNT} users, ${REQUEST_COUNT} historical requests, ` +
      `${QUEUE_POOL_COUNT} fresh queue-pool requests...`,
  );

  // Users + sessions, inserted directly — no password hash, no email send,
  // no auth throttle hit.
  const userRows = Array.from({ length: USER_COUNT }, (_, i) => ({
    email: `loadtest-u${i}@${EMAIL_DOMAIN}`,
  }));
  const insertedUsers = await sql`
    INSERT INTO users ${sql(userRows, 'email')} RETURNING id
  `;
  const userIds: string[] = insertedUsers.map((row) => row.id as string);

  const tokens = userIds.map(() => randomBytes(32).toString('hex'));
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const sessionRows = userIds.map((userId, i) => ({
    token: tokens[i],
    user_id: userId,
    expires_at: expiresAt,
  }));
  if (sessionRows.length > 0) {
    await sql`INSERT INTO sessions ${sql(sessionRows, 'token', 'user_id', 'expires_at')}`;
  }

  // Historical requests + replies, spread over the last 30 days with mixed
  // member/guest authorship — gives /requests/feed, /public/stats,
  // /records, etc. real volume to page/aggregate over instead of
  // near-empty responses.
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const requestRows = Array.from({ length: REQUEST_COUNT }, (_, i) => {
    const createdAt = new Date(now - Math.random() * THIRTY_DAYS_MS);
    const useMember = Math.random() < 0.5 && userIds.length > 0;
    return useMember
      ? {
          body: randomBody(`req-${i}`),
          author_id: userIds[Math.floor(Math.random() * userIds.length)],
          guest_id: null as string | null,
          created_at: createdAt,
        }
      : {
          body: randomBody(`req-${i}`),
          author_id: null as string | null,
          guest_id: `${GUEST_PREFIX}fixture-${i}`,
          created_at: createdAt,
        };
  });
  const insertedRequests = await sql`
    INSERT INTO requests ${sql(requestRows, 'body', 'author_id', 'guest_id', 'created_at')}
    RETURNING id, created_at
  `;

  const replyRows: Record<string, unknown>[] = [];
  for (const request of insertedRequests) {
    const replyCount = Math.floor(Math.random() * 5); // 0-4
    const usedAuthorIds = new Set<string>();
    const requestCreatedAt = request.created_at as Date;
    for (let k = 0; k < replyCount; k++) {
      const replyCreatedAt = new Date(
        requestCreatedAt.getTime() + Math.random() * 6 * 60 * 60 * 1000,
      );
      const useMember = Math.random() < 0.5 && userIds.length > 0;
      if (useMember) {
        const candidates = userIds.filter((id) => !usedAuthorIds.has(id));
        if (candidates.length === 0) continue;
        const authorId =
          candidates[Math.floor(Math.random() * candidates.length)];
        usedAuthorIds.add(authorId);
        replyRows.push({
          request_id: request.id,
          body: randomBody(`reply-${request.id}-${k}`),
          author_id: authorId,
          guest_id: null,
          created_at: replyCreatedAt,
        });
      } else {
        replyRows.push({
          request_id: request.id,
          body: randomBody(`reply-${request.id}-${k}`),
          author_id: null,
          guest_id: `${GUEST_PREFIX}reply-${request.id}-${k}`,
          created_at: replyCreatedAt,
        });
      }
    }
  }
  if (replyRows.length > 0) {
    await sql`
      INSERT INTO replies ${sql(replyRows, 'request_id', 'body', 'author_id', 'guest_id', 'created_at')}
    `;
  }

  // A small, deliberately fresh (createdAt = now) and reply-free pool,
  // reserved for the queue-concurrency scenario — GET /requests/queue only
  // ever returns one candidate at a time, so a small shared pool is what
  // makes concurrent VUs actually contend over the same rows.
  const queuePoolRows = Array.from({ length: QUEUE_POOL_COUNT }, (_, i) => {
    const useMember = Math.random() < 0.5 && userIds.length > 0;
    return useMember
      ? {
          body: randomBody(`queue-${i}`),
          author_id: userIds[Math.floor(Math.random() * userIds.length)],
          guest_id: null as string | null,
        }
      : {
          body: randomBody(`queue-${i}`),
          author_id: null as string | null,
          guest_id: `${GUEST_PREFIX}queuepool-${i}`,
        };
  });
  if (queuePoolRows.length > 0) {
    await sql`
      INSERT INTO requests ${sql(queuePoolRows, 'body', 'author_id', 'guest_id')}
    `;
  }

  mkdirSync(dirname(TOKENS_OUT_PATH), { recursive: true });
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(TOKENS_OUT_PATH, JSON.stringify(tokens, null, 2));
  console.log(`Done. ${tokens.length} session tokens written to ${TOKENS_OUT_PATH}.`);
}

async function main(): Promise<void> {
  try {
    if (CLEANUP) {
      await cleanup();
    } else {
      await seed();
    }
  } finally {
    await sql.end();
  }
}

void main();
